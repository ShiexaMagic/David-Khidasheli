/* ========================================
   David Khidasheli — Art Gallery
   JavaScript (data-driven)
   ======================================== */

(function () {
    'use strict';

    // ---- State ----
    let currentLang = localStorage.getItem('lang') || 'en';
    let cart = JSON.parse(localStorage.getItem('cart') || '[]');
    let lightboxIndex = 0;
    let visiblePaintings = [];

    // ---- DOM Elements ----
    const body = document.body;
    const header = document.getElementById('header');
    const langToggle = document.getElementById('langToggle');
    const hamburger = document.getElementById('hamburger');
    const mobileMenu = document.getElementById('mobileMenu');
    const cartBtn = document.getElementById('cartBtn');
    const cartCount = document.getElementById('cartCount');
    const cartOverlay = document.getElementById('cartOverlay');
    const cartSidebar = document.getElementById('cartSidebar');
    const cartClose = document.getElementById('cartClose');
    const cartItems = document.getElementById('cartItems');
    const cartFooter = document.getElementById('cartFooter');
    const cartTotal = document.getElementById('cartTotal');
    const checkoutBtn = document.getElementById('checkoutBtn');
    const galleryGrid = document.getElementById('galleryGrid');
    const filterBar = document.querySelector('.filter-bar');
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightboxImg');
    const lightboxTitle = document.getElementById('lightboxTitle');
    const lightboxDetail = document.getElementById('lightboxDetail');
    const lightboxClose = document.getElementById('lightboxClose');
    const lightboxPrev = document.getElementById('lightboxPrev');
    const lightboxNext = document.getElementById('lightboxNext');
    const contactForm = document.getElementById('contactForm');
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toastMsg');

    let currentFilter = 'all';
    let currentDetailPainting = null;

    // Category labels: dynamically built from PaintingsDB (built-in + custom)
    function getCategoryLabels() {
        const labels = { 'all': { en: 'All', ka: 'ყველა' } };
        PaintingsDB.getAllCategories().forEach(c => {
            labels[c.id] = { en: c.en, ka: c.ka };
        });
        return labels;
    }

    // Pagination
    const PAINTINGS_PER_PAGE = 30;
    let currentPage = 1;

    // ---- Initialize ----
    function init() {
        // If arriving from serverless redirect (hash-based), convert to pushState
        const hashMatch = location.hash.match(/^#\/painting\/(.+)$/);
        if (hashMatch) {
            const paintId = decodeURIComponent(hashMatch[1]);
            history.replaceState({ painting: paintId }, '', '/painting/' + paintId);
        }

        // Random hero painting
        const allP = PaintingsDB.getAll();
        if (allP.length) {
            const rp = allP[Math.floor(Math.random() * allP.length)];
            const heroImg = document.getElementById('heroImg');
            if (heroImg) { heroImg.src = rp.img; heroImg.alt = rp.titleEn; }
        }

        renderFilters();
        renderGallery();
        setLanguage(currentLang);
        updateCart();
        bindEvents();
        handleRoute();
    }

    // ---- Render dynamic filter buttons ----
    function renderFilters() {
        const paintings = PaintingsDB.getAll();
        const usedCats = new Set(paintings.map(p => p.category));

        // Sort: "for-sale" first, then custom series (alphabetically), then years ascending
        const isYear = (s) => /^\d{4}$/.test(s);
        const sortedCats = Array.from(usedCats).sort((a, b) => {
            if (a === 'for-sale') return -1;
            if (b === 'for-sale') return 1;
            const aYear = isYear(a), bYear = isYear(b);
            if (!aYear && bYear) return -1; // custom series before years
            if (aYear && !bYear) return 1;
            return a.localeCompare(b, undefined, { numeric: true });
        });

        const allLabels = getCategoryLabels();
        let html = '';
        html += `<button class="filter-btn active" data-filter="all" data-en="All" data-ka="ყველა">All</button>`;

        sortedCats.forEach(cat => {
            const labels = allLabels[cat] || { en: cat, ka: cat };
            html += `<button class="filter-btn" data-filter="${cat}" data-en="${labels.en}" data-ka="${labels.ka}">${labels.en}</button>`;
        });

        filterBar.innerHTML = html;

        filterBar.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                filterBar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentFilter = btn.dataset.filter;
                renderGallery();
                setLanguageOnFilterBtns();
            });
        });
    }

    function setLanguageOnFilterBtns() {
        filterBar.querySelectorAll('.filter-btn').forEach(btn => {
            const text = btn.getAttribute(`data-${currentLang}`);
            if (text) btn.textContent = text;
        });
    }

    // ---- Render gallery from data ----

    // Translate material & paint type names
    const materialNames = {
        board:     { en: 'Board',     ka: 'ფირფიცარი' },
        canvas:    { en: 'Canvas',    ka: 'ტილო' },
        paper:     { en: 'Paper',     ka: 'ქაღალდი' },
        wood:      { en: 'Wood',      ka: 'ხე' },
        cardboard: { en: 'Cardboard', ka: 'მუყაო' },
        linen:     { en: 'Linen',     ka: 'სელი' }
    };
    const paintNames = {
        tempera:    { en: 'Egg Tempera',ka: 'კვერცხის ტემპერა' },
        oil:        { en: 'Oil',        ka: 'ზეთი' },
        acrylic:    { en: 'Acrylic',    ka: 'აკრილი' },
        watercolor: { en: 'Watercolor', ka: 'აკვარელი' },
        gouache:    { en: 'Gouache',    ka: 'გუაში' },
        pastel:     { en: 'Pastel',     ka: 'პასტელი' },
        mixed:      { en: 'Mixed Media',ka: 'შერეული' }
    };

    function buildCardHtml(p, index) {
        const soldBadge = p.sold
            ? `<span class="painting-sold-badge" data-en="Sold" data-ka="გაყიდულია">Sold</span>`
            : '';

        const forSaleBadge = (!p.sold && p.category === 'for-sale')
            ? `<span class="painting-for-sale-badge" data-en="For Sale" data-ka="იყიდება">For Sale</span>`
            : '';

        // Price tag under title (only for "for-sale" paintings)
        let priceHtml = '';
        if (p.category === 'for-sale' && !p.sold) {
            if (p.price != null) {
                priceHtml = `<div class="painting-price-tag">$ ${p.price}</div>`;
            } else {
                priceHtml = `<div class="painting-price-tag inquiry" data-en="Price on inquiry" data-ka="ფასი შეკითხვით">Price on inquiry</div>`;
            }
        }

        return `
        <div class="painting-card" data-category="${p.category}" style="animation-delay:${(index % PAINTINGS_PER_PAGE) * 0.06}s;">
            <div class="painting-img-wrap">
                ${soldBadge}
                ${forSaleBadge}
                <img src="${p.img}" alt="${escHtml(p.titleEn)} — original painting for sale by Georgian artist David Khidasheli, egg tempera on board" loading="lazy">
                <div class="painting-overlay">
                    <button class="view-btn" data-index="${index}" data-en="View" data-ka="ნახვა">View</button>
                    <button class="share-btn" data-index="${index}" title="Share">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                    </button>
                </div>
            </div>
            <div class="painting-info">
                <h3 class="painting-title"><a href="/painting/${p.id}" data-painting-id="${p.id}" data-en="${escHtml(p.titleEn)}" data-ka="${escHtml(p.titleKa)}">${escHtml(p.titleEn)}</a></h3>
                ${priceHtml}
            </div>
        </div>`;
    }

    function bindGalleryCardEvents() {
        galleryGrid.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', () => openLightbox(parseInt(btn.dataset.index)));
        });
        galleryGrid.querySelectorAll('.painting-img-wrap img').forEach((img, idx) => {
            img.style.cursor = 'pointer';
            img.addEventListener('click', () => {
                const card = img.closest('.painting-card');
                const viewBtn = card.querySelector('.view-btn');
                if (viewBtn) openLightbox(parseInt(viewBtn.dataset.index));
            });
        });
        galleryGrid.querySelectorAll('.add-cart-btn:not([disabled])').forEach(btn => {
            btn.addEventListener('click', () => addToCart(btn));
        });
        galleryGrid.querySelectorAll('.share-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                sharePainting(parseInt(btn.dataset.index));
            });
        });
        galleryGrid.querySelectorAll('a[data-painting-id]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const paintId = link.dataset.paintingId;
                history.pushState({ painting: paintId }, '', '/painting/' + paintId);
                showPaintingDetail(paintId);
            });
        });
    }

    // Category sort order: for-sale first, custom series alphabetically, then years ascending, 'other' last
    function getCategorySortOrder() {
        const paintings = PaintingsDB.getAll();
        const usedCats = [...new Set(paintings.map(p => p.category))];
        const isYear = (s) => /^\d{4}$/.test(s);
        return usedCats.sort((a, b) => {
            if (a === 'for-sale') return -1;
            if (b === 'for-sale') return 1;
            if (a === 'other') return 1;
            if (b === 'other') return -1;
            const aYear = isYear(a), bYear = isYear(b);
            if (!aYear && bYear) return -1;
            if (aYear && !bYear) return 1;
            return a.localeCompare(b, undefined, { numeric: true });
        });
    }

    function renderGallery() {
        const allPaintings = PaintingsDB.getAll();

        if (currentFilter === 'all') {
            // Sort by category order so paintings are grouped
            const catOrder = getCategorySortOrder();
            const orderMap = {};
            catOrder.forEach((c, i) => { orderMap[c] = i; });
            visiblePaintings = [...allPaintings].sort((a, b) => {
                return (orderMap[a.category] ?? 999) - (orderMap[b.category] ?? 999);
            });
        } else {
            visiblePaintings = allPaintings.filter(p => p.category === currentFilter);
        }

        currentPage = 1;
        const pageItems = visiblePaintings.slice(0, PAINTINGS_PER_PAGE);

        let html = '';
        const allLabels = getCategoryLabels();
        let lastCat = null;
        pageItems.forEach((p, index) => {
            if (currentFilter === 'all' && p.category !== lastCat) {
                lastCat = p.category;
                const labels = allLabels[p.category] || { en: p.category, ka: p.category };
                html += `<div class="gallery-section-header" data-en="${escHtml(labels.en)}" data-ka="${escHtml(labels.ka)}">${escHtml(currentLang === 'ka' ? labels.ka : labels.en)}</div>`;
            }
            html += buildCardHtml(p, index);
        });

        // Load More button
        if (visiblePaintings.length > PAINTINGS_PER_PAGE) {
            html += `<div class="load-more-wrap" id="loadMoreWrap">
                <button class="load-more-btn" id="loadMoreBtn">
                    <span data-en="Load More (${visiblePaintings.length - PAINTINGS_PER_PAGE} remaining)" data-ka="მეტის ჩატვირთვა (${visiblePaintings.length - PAINTINGS_PER_PAGE} დარჩენილი)">Load More (${visiblePaintings.length - PAINTINGS_PER_PAGE} remaining)</span>
                </button>
            </div>`;
        }

        galleryGrid.innerHTML = html;

        // Bind load-more
        const loadMoreBtn = document.getElementById('loadMoreBtn');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', loadMorePaintings);
        }

        bindGalleryCardEvents();
        observeAnimations();
        updateLanguageOnElements(galleryGrid);
    }

    function loadMorePaintings() {
        currentPage++;
        const start = (currentPage - 1) * PAINTINGS_PER_PAGE;
        const end = currentPage * PAINTINGS_PER_PAGE;
        const nextItems = visiblePaintings.slice(start, end);

        // Remove the load-more button
        const wrap = document.getElementById('loadMoreWrap');
        if (wrap) wrap.remove();

        // Append new cards
        let html = '';
        const allLabels = getCategoryLabels();
        // Determine the last category shown so far
        let lastCat = start > 0 ? visiblePaintings[start - 1].category : null;
        nextItems.forEach((p, i) => {
            if (currentFilter === 'all' && p.category !== lastCat) {
                lastCat = p.category;
                const labels = allLabels[p.category] || { en: p.category, ka: p.category };
                html += `<div class="gallery-section-header" data-en="${escHtml(labels.en)}" data-ka="${escHtml(labels.ka)}">${escHtml(currentLang === 'ka' ? labels.ka : labels.en)}</div>`;
            }
            html += buildCardHtml(p, start + i);
        });

        // Add new load-more if there are still more
        const remaining = visiblePaintings.length - end;
        if (remaining > 0) {
            html += `<div class="load-more-wrap" id="loadMoreWrap">
                <button class="load-more-btn" id="loadMoreBtn">
                    <span data-en="Load More (${remaining} remaining)" data-ka="მეტის ჩატვირთვა (${remaining} დარჩენილი)">Load More (${remaining} remaining)</span>
                </button>
            </div>`;
        }

        galleryGrid.insertAdjacentHTML('beforeend', html);

        // Re-bind only newly added buttons
        const newBtn = document.getElementById('loadMoreBtn');
        if (newBtn) newBtn.addEventListener('click', loadMorePaintings);

        bindGalleryCardEvents();
        observeAnimations();
        updateLanguageOnElements(galleryGrid);
    }

    function escHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // ---- Language System ----
    function setLanguage(lang) {
        currentLang = lang;
        localStorage.setItem('lang', lang);

        if (lang === 'ka') {
            body.classList.add('ka');
        } else {
            body.classList.remove('ka');
        }

        document.querySelectorAll('[data-en][data-ka]').forEach(el => {
            const text = el.getAttribute(`data-${lang}`);
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = text;
            } else if (el.tagName === 'OPTION') {
                el.textContent = text;
            } else {
                el.textContent = text;
            }
        });

        updateCartDisplay();
    }

    function updateLanguageOnElements(container) {
        container.querySelectorAll('[data-en][data-ka]').forEach(el => {
            const text = el.getAttribute(`data-${currentLang}`);
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = text;
            } else {
                el.textContent = text;
            }
        });
    }

    function toggleLanguage() {
        setLanguage(currentLang === 'en' ? 'ka' : 'en');
    }

    // ---- Header Scroll ----
    function handleScroll() {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    }

    // ---- Mobile Menu ----
    function toggleMobile() {
        mobileMenu.classList.toggle('open');
        hamburger.classList.toggle('active');
    }

    function closeMobile() {
        mobileMenu.classList.remove('open');
        hamburger.classList.remove('active');
    }

    // ---- Lightbox ----
    function openLightbox(index) {
        lightboxIndex = index;
        updateLightbox();
        lightbox.classList.add('open');
        body.style.overflow = 'hidden';
    }

    function closeLightboxFn() {
        lightbox.classList.remove('open');
        body.style.overflow = '';
    }

    function updateLightbox() {
        const p = visiblePaintings[lightboxIndex];
        if (!p) return;
        lightboxImg.src = p.img;
        lightboxTitle.textContent = currentLang === 'ka' ? p.titleKa : p.titleEn;

        // Build spec line for lightbox
        const mat = materialNames[p.material] || { en: 'Canvas', ka: 'ტილო' };
        const paint = paintNames[p.paintType] || { en: 'Oil', ka: 'ზეთი' };
        const sizeStr = (p.widthCm && p.heightCm) ? ` ${p.widthCm}×${p.heightCm} cm` : '';
        const specLine = currentLang === 'ka'
            ? `${paint.ka} ${mat.ka.toLowerCase()}ზე,${sizeStr}`
            : `${paint.en} on ${mat.en.toLowerCase()},${sizeStr}`;
        const detailLine = currentLang === 'ka' ? p.detailKa : p.detailEn;
        lightboxDetail.textContent = `${specLine} — ${detailLine}`;
    }

    function prevLightbox() {
        lightboxIndex = (lightboxIndex - 1 + visiblePaintings.length) % visiblePaintings.length;
        updateLightbox();
    }

    function nextLightbox() {
        lightboxIndex = (lightboxIndex + 1) % visiblePaintings.length;
        updateLightbox();
    }

    // ---- Cart ----
    function addToCart(btn) {
        const id = btn.dataset.id;
        const existing = cart.find(item => item.id === id);

        if (existing) {
            showToast(currentLang === 'ka' ? 'უკვე კალათაშია' : 'Already in cart');
            return;
        }

        cart.push({
            id: id,
            nameEn: btn.dataset.nameEn,
            nameKa: btn.dataset.nameKa,
            price: parseInt(btn.dataset.price),
            img: btn.dataset.img
        });

        localStorage.setItem('cart', JSON.stringify(cart));
        updateCart();
        btn.classList.add('added');
        btn.querySelector('span').textContent = currentLang === 'ka' ? '✓ დამატებულია' : '✓ Added';

        setTimeout(() => {
            btn.classList.remove('added');
            const span = btn.querySelector('span');
            span.textContent = span.getAttribute(`data-${currentLang}`);
        }, 2000);

        showToast(currentLang === 'ka' ? 'კალათაში დაემატა!' : 'Added to cart!');
    }

    function removeFromCart(id) {
        cart = cart.filter(item => item.id !== id);
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCart();
    }

    function updateCart() {
        const count = cart.length;
        cartCount.textContent = count;
        cartCount.classList.toggle('visible', count > 0);
        updateCartDisplay();
    }

    function updateCartDisplay() {
        if (cart.length === 0) {
            cartItems.innerHTML = `<p class="cart-empty">${currentLang === 'ka' ? 'კალათა ცარიელია' : 'Your cart is empty'}</p>`;
            cartFooter.style.display = 'none';
            return;
        }

        let html = '';
        let total = 0;
        cart.forEach(item => {
            total += item.price;
            const name = currentLang === 'ka' ? item.nameKa : item.nameEn;
            html += `
                <div class="cart-item">
                    <img src="${item.img}" alt="${name}">
                    <div class="cart-item-info">
                        <div class="cart-item-name">${name}</div>
                        <div class="cart-item-price">$ ${item.price}</div>
                    </div>
                    <button class="cart-item-remove" data-id="${item.id}" title="Remove">✕</button>
                </div>
            `;
        });

        cartItems.innerHTML = html;
        cartTotal.textContent = `$ ${total}`;
        cartFooter.style.display = 'block';

        cartItems.querySelectorAll('.cart-item-remove').forEach(btn => {
            btn.addEventListener('click', () => removeFromCart(btn.dataset.id));
        });
    }

    function openCart() {
        cartSidebar.classList.add('open');
        cartOverlay.classList.add('open');
        body.style.overflow = 'hidden';
    }

    function closeCart() {
        cartSidebar.classList.remove('open');
        cartOverlay.classList.remove('open');
        body.style.overflow = '';
    }

    // ---- Toast ----
    function showToast(message) {
        toastMsg.textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2500);
    }

    // ---- Contact Form ----
    function handleFormSubmit(e) {
        e.preventDefault();
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const message = document.getElementById('message').value;
        const subjectText = document.getElementById('subject').options[document.getElementById('subject').selectedIndex].textContent;
        const mailBody = `Name: ${name}%0D%0AEmail: ${email}%0D%0ASubject: ${subjectText}%0D%0A%0D%0A${encodeURIComponent(message)}`;
        window.location.href = `mailto:david.khidasheli@gmail.com?subject=${encodeURIComponent(subjectText + ' - ' + name)}&body=${mailBody}`;
        showToast(currentLang === 'ka' ? 'შეტყობინება გაიგზავნა!' : 'Message sent!');
        contactForm.reset();
    }

    // ---- Checkout ----
    function handleCheckout() {
        let orderText = currentLang === 'ka' ? 'შეკვეთა:\n' : 'Order:\n';
        let total = 0;
        cart.forEach(item => {
            const name = currentLang === 'ka' ? item.nameKa : item.nameEn;
            orderText += `- ${name}: $${item.price}\n`;
            total += item.price;
        });
        orderText += `\n${currentLang === 'ka' ? 'ჯამი' : 'Total'}: $${total}`;
        const mailBody = encodeURIComponent(orderText);
        const subject = encodeURIComponent(currentLang === 'ka' ? 'შეკვეთა - დავით ხიდაშელი' : 'Order - David Khidasheli');
        window.location.href = `mailto:david.khidasheli@gmail.com?subject=${subject}&body=${mailBody}`;
        showToast(currentLang === 'ka' ? 'შეკვეთა გაიგზავნა!' : 'Order sent!');
    }

    // ---- Scroll Animations ----
    function observeAnimations() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.animationPlayState = 'running';
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });

        galleryGrid.querySelectorAll('.painting-card').forEach(card => {
            card.style.animationPlayState = 'paused';
            observer.observe(card);
        });
    }

    // ---- Smooth scroll ----
    function smoothScroll(e) {
        const href = e.currentTarget.getAttribute('href');
        if (href && href.startsWith('#')) {
            e.preventDefault();

            // If on detail page, return to main page first
            if (body.classList.contains('detail-view-active')) {
                hidePaintingDetail();
                history.pushState(null, '', '/' + href);
                requestAnimationFrame(() => {
                    const target = document.querySelector(href);
                    if (target) {
                        const offset = 80;
                        const top = target.getBoundingClientRect().top + window.pageYOffset - offset;
                        window.scrollTo({ top, behavior: 'smooth' });
                    }
                });
            } else {
                const target = document.querySelector(href);
                if (target) {
                    const offset = 80;
                    const top = target.getBoundingClientRect().top + window.pageYOffset - offset;
                    window.scrollTo({ top, behavior: 'smooth' });
                }
            }
            closeMobile();
        }
    }

    // ---- Event Bindings ----
    function bindEvents() {
        langToggle.addEventListener('click', toggleLanguage);
        window.addEventListener('scroll', handleScroll, { passive: true });
        window.addEventListener('popstate', handleRoute);
        hamburger.addEventListener('click', toggleMobile);

        document.querySelectorAll('a[href^="#"]').forEach(link => {
            link.addEventListener('click', smoothScroll);
        });

        // Detail view back button
        const detailBack = document.getElementById('detailBack');
        if (detailBack) {
            detailBack.addEventListener('click', () => {
                hidePaintingDetail();
                history.pushState(null, '', '/');
                requestAnimationFrame(() => {
                    const gallery = document.querySelector('#gallery');
                    if (gallery) {
                        const offset = 80;
                        const top = gallery.getBoundingClientRect().top + window.pageYOffset - offset;
                        window.scrollTo({ top, behavior: 'smooth' });
                    }
                });
            });
        }

        lightboxClose.addEventListener('click', closeLightboxFn);
        lightboxPrev.addEventListener('click', prevLightbox);
        lightboxNext.addEventListener('click', nextLightbox);

        const lightboxShareBtn = document.getElementById('lightboxShareBtn');
        if (lightboxShareBtn) {
            lightboxShareBtn.addEventListener('click', () => sharePainting(lightboxIndex));
        }

        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) closeLightboxFn();
        });

        document.addEventListener('keydown', (e) => {
            if (lightbox.classList.contains('open')) {
                if (e.key === 'Escape') closeLightboxFn();
                if (e.key === 'ArrowLeft') prevLightbox();
                if (e.key === 'ArrowRight') nextLightbox();
            }
            if (cartSidebar.classList.contains('open') && e.key === 'Escape') {
                closeCart();
            }
        });

        cartBtn.addEventListener('click', openCart);
        cartClose.addEventListener('click', closeCart);
        cartOverlay.addEventListener('click', closeCart);
        checkoutBtn.addEventListener('click', handleCheckout);
        contactForm.addEventListener('submit', handleFormSubmit);

        let touchStartX = 0;
        lightbox.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });
        lightbox.addEventListener('touchend', (e) => {
            const diff = e.changedTouches[0].screenX - touchStartX;
            if (Math.abs(diff) > 50) {
                if (diff > 0) prevLightbox();
                else nextLightbox();
            }
        }, { passive: true });
    }

    // ---- Share Painting ----
    async function sharePainting(paintingOrIndex) {
        let p;
        if (typeof paintingOrIndex === 'object' && paintingOrIndex !== null) {
            p = paintingOrIndex;
        } else {
            p = visiblePaintings[paintingOrIndex];
        }
        if (!p) return;

        const title = currentLang === 'ka' ? p.titleKa : p.titleEn;
        const mat = materialNames[p.material] || { en: 'Canvas', ka: 'ტილო' };
        const paint = paintNames[p.paintType] || { en: 'Oil', ka: 'ზეთი' };
        const sizeStr = (p.widthCm && p.heightCm) ? `${p.widthCm}×${p.heightCm} cm` : '';
        const specLine = currentLang === 'ka'
            ? `${paint.ka} ${mat.ka.toLowerCase()}ზე, ${sizeStr}`
            : `${paint.en} on ${mat.en.toLowerCase()}, ${sizeStr}`;
        const priceLine = p.price != null ? `$ ${p.price}` : '';
        const paintingUrl = `https://www.davidkhidasheli.art/painting/${p.id}`;

        const shareText = [
            `David Khidasheli — "${title}"`,
            specLine,
            priceLine
        ].filter(Boolean).join('\n');

        const clipboardText = shareText + '\n' + paintingUrl;

        const shareData = {
            title: `David Khidasheli — ${title}`,
            text: shareText,
            url: paintingUrl
        };

        // Try to include the painting image as a shared file (mobile)
        if (navigator.canShare && p.img && !p.img.startsWith('data:')) {
            try {
                const response = await fetch(p.img);
                const blob = await response.blob();
                const ext = p.img.split('.').pop().split('?')[0] || 'jpg';
                const file = new File([blob], `${title}.${ext}`, { type: blob.type });
                const dataWithFile = { ...shareData, files: [file] };
                if (navigator.canShare(dataWithFile)) {
                    shareData.files = [file];
                }
            } catch (_) { /* ignore, share without file */ }
        }

        if (navigator.share) {
            try {
                await navigator.share(shareData);
                return;
            } catch (err) {
                if (err.name === 'AbortError') return;
            }
        }

        // Fallback: copy text to clipboard
        try {
            await navigator.clipboard.writeText(clipboardText);
            showToast(currentLang === 'ka' ? 'დაკოპირებულია!' : 'Copied to clipboard!');
        } catch (_) {
            showToast(currentLang === 'ka' ? 'გაზიარება ვერ მოხერხდა' : 'Could not share');
        }
    }

    // ---- Routing & Detail View ----
    function handleRoute() {
        const path = location.pathname;
        const match = path.match(/^\/painting\/(.+)$/);
        if (match) {
            showPaintingDetail(decodeURIComponent(match[1]));
        } else if (body.classList.contains('detail-view-active')) {
            hidePaintingDetail();
        }
    }

    function showPaintingDetail(id) {
        const p = PaintingsDB.getById(id);
        if (!p) {
            history.replaceState(null, '', window.location.pathname);
            hidePaintingDetail();
            return;
        }

        currentDetailPainting = p;

        // Image
        const img = document.getElementById('detailImg');
        img.src = p.img;
        img.alt = p.titleEn;

        // Category
        const catEl = document.getElementById('detailCategory');
        const allCatLabels = getCategoryLabels();
        const catLabels = allCatLabels[p.category] || { en: p.category, ka: p.category };
        catEl.setAttribute('data-en', catLabels.en);
        catEl.setAttribute('data-ka', catLabels.ka);
        catEl.textContent = currentLang === 'ka' ? catLabels.ka : catLabels.en;

        // Title
        const titleEl = document.getElementById('detailTitle');
        titleEl.setAttribute('data-en', p.titleEn);
        titleEl.setAttribute('data-ka', p.titleKa);
        titleEl.textContent = currentLang === 'ka' ? p.titleKa : p.titleEn;

        // Specs
        const mat = materialNames[p.material] || { en: 'Canvas', ka: 'ტილო' };
        const paint = paintNames[p.paintType] || { en: 'Oil', ka: 'ზეთი' };
        const sizeStr = (p.widthCm && p.heightCm) ? `${p.widthCm}×${p.heightCm} cm` : '';
        const specEn = `${paint.en} on ${mat.en.toLowerCase()}${sizeStr ? ', ' + sizeStr : ''}`;
        const specKa = `${paint.ka} ${mat.ka.toLowerCase()}ზე${sizeStr ? ', ' + sizeStr : ''}`;

        const specsEl = document.getElementById('detailSpecs');
        specsEl.setAttribute('data-en', specEn);
        specsEl.setAttribute('data-ka', specKa);
        specsEl.textContent = currentLang === 'ka' ? specKa : specEn;

        // Size badge
        document.getElementById('detailSize').textContent = sizeStr;

        // Description
        const descEl = document.getElementById('detailDesc');
        descEl.setAttribute('data-en', p.detailEn);
        descEl.setAttribute('data-ka', p.detailKa);
        descEl.textContent = currentLang === 'ka' ? p.detailKa : p.detailEn;

        // Price
        const priceEl = document.getElementById('detailPriceRow');
        if (p.price != null) {
            priceEl.innerHTML = `$ ${p.price}`;
        } else {
            priceEl.innerHTML = `<span class="inquiry-label" data-en="Price on inquiry" data-ka="ფასი შეკითხვით">${currentLang === 'ka' ? 'ფასი შეკითხვით' : 'Price on inquiry'}</span>`;
        }

        // Actions
        const actionsEl = document.getElementById('detailActions');
        let actionsHtml = '';

        if (p.sold) {
            actionsHtml += `<button class="detail-cart-btn" disabled style="opacity:0.5;cursor:not-allowed;">
                <span data-en="Sold" data-ka="გაყიდულია">${currentLang === 'ka' ? 'გაყიდულია' : 'Sold'}</span>
            </button>`;
        } else if (p.price != null) {
            actionsHtml += `<button class="detail-cart-btn" id="detailCartBtn"
                data-id="${p.id}" data-name-en="${escHtml(p.titleEn)}" data-name-ka="${escHtml(p.titleKa)}" data-price="${p.price}" data-img="${p.img}">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 01-8 0"></path></svg>
                <span data-en="Add to Cart" data-ka="კალათაში დამატება">${currentLang === 'ka' ? 'კალათაში დამატება' : 'Add to Cart'}</span>
            </button>`;
        }

        actionsHtml += `<button class="detail-share-btn" id="detailShareBtn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            <span data-en="Share" data-ka="გაზიარება">${currentLang === 'ka' ? 'გაზიარება' : 'Share'}</span>
        </button>`;

        actionsEl.innerHTML = actionsHtml;

        // Bind detail action events
        const cartBtnEl = document.getElementById('detailCartBtn');
        if (cartBtnEl && !cartBtnEl.disabled) {
            cartBtnEl.addEventListener('click', () => addToCart(cartBtnEl));
        }

        const shareBtnEl = document.getElementById('detailShareBtn');
        if (shareBtnEl) {
            shareBtnEl.addEventListener('click', () => sharePainting(p));
        }

        // Click image to open lightbox
        img.style.cursor = 'zoom-in';
        img.onclick = () => {
            const allPaintings = PaintingsDB.getAll();
            visiblePaintings = allPaintings;
            const idx = allPaintings.findIndex(x => x.id === p.id);
            if (idx >= 0) openLightbox(idx);
        };

        // Update browser URL to clean path
        history.replaceState({ painting: id }, '', '/painting/' + id);

        // Update page title
        document.title = `${p.titleEn} — David Khidasheli`;

        // Show detail view
        body.classList.add('detail-view-active');
        window.scrollTo(0, 0);
    }

    function hidePaintingDetail() {
        body.classList.remove('detail-view-active');
        currentDetailPainting = null;
        document.title = 'David Khidasheli | დავით ხიდაშელი — Art Gallery';
        // Only reset URL if we're still on a painting path
        if (location.pathname.startsWith('/painting/')) {
            history.replaceState(null, '', '/');
        }
    }

    // ---- Start ----
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
