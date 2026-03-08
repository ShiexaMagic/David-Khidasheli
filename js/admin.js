/* ===== Admin Panel Logic ===== */
(function () {
    'use strict';

    const DEFAULT_PASS = 'khidasheli2025';
    const PASS_KEY = 'admin_password';
    const AUTH_KEY = 'admin_auth';

    /* ---------- Helpers ---------- */
    function getPassword() {
        return localStorage.getItem(PASS_KEY) || DEFAULT_PASS;
    }
    function setPassword(p) {
        localStorage.setItem(PASS_KEY, p);
    }
    function isAuthenticated() {
        return sessionStorage.getItem(AUTH_KEY) === 'true';
    }
    function authenticate() {
        sessionStorage.setItem(AUTH_KEY, 'true');
    }
    function logout() {
        sessionStorage.removeItem(AUTH_KEY);
    }

    function $(id) { return document.getElementById(id); }

    function showToast(msg) {
        const t = $('adminToast');
        $('adminToastMsg').textContent = msg;
        t.classList.add('visible');
        clearTimeout(t._timer);
        t._timer = setTimeout(() => t.classList.remove('visible'), 2600);
    }

    /* ---------- Login ---------- */
    function initLogin() {
        if (isAuthenticated()) {
            showDashboard();
            return;
        }
        $('loginScreen').style.display = '';
        $('adminDashboard').style.display = 'none';

        $('loginForm').addEventListener('submit', function (e) {
            e.preventDefault();
            const val = $('loginPass').value.trim();
            if (val === getPassword()) {
                authenticate();
                showDashboard();
            } else {
                $('loginError').textContent = 'Wrong password';
                $('loginPass').value = '';
                $('loginPass').focus();
            }
        });
    }

    function showDashboard() {
        $('loginScreen').style.display = 'none';
        $('adminDashboard').style.display = '';
        refreshCategoryDropdowns();
        renderCategoryList();
        renderExcludeChips();
        renderStats();
        renderTable();
    }

    /* ---------- Stats ---------- */
    function renderStats() {
        const list = PaintingsDB.getAll();
        const total = list.length;
        const available = list.filter(p => !p.sold).length;
        const soldCount = list.filter(p => p.sold).length;
        const totalValue = list.reduce((s, p) => s + (p.price || 0), 0);

        $('adminStats').innerHTML = `
            <div class="stat-card">
                <div class="stat-label">Total Paintings</div>
                <div class="stat-value">${total}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Available</div>
                <div class="stat-value">${available}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Sold</div>
                <div class="stat-value">${soldCount}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Total Value</div>
                <div class="stat-value">$${totalValue.toLocaleString()}</div>
            </div>
        `;
    }

    /* ---------- Table ---------- */
    let adminFilter = 'all';  // category filter for admin table
    let excludedCategories = new Set();  // categories to exclude from table

    function renderTable() {
        let list = PaintingsDB.getAll();
        if (adminFilter !== 'all') {
            list = list.filter(p => p.category === adminFilter);
        }
        if (excludedCategories.size > 0) {
            list = list.filter(p => !excludedCategories.has(p.category));
        }
        $('paintingCount').textContent = list.length;
        const tbody = $('paintingsTableBody');

        if (list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:2rem;color:#6e6e73;">No paintings found.</td></tr>';
            updateBulkToolbar();
            return;
        }

        const allCats = PaintingsDB.getAllCategories();

        tbody.innerHTML = list.map(p => {
            const matLabel = capitalize(p.material || 'canvas');
            const paintLabel = capitalize(p.paintType || 'oil');
            const sizeLabel = (p.widthCm && p.heightCm) ? `${p.widthCm}×${p.heightCm}` : '—';
            const catObj = allCats.find(c => c.id === p.category);
            const catLabel = catObj ? catObj.en : (p.category || '—');
            return `
            <tr data-id="${p.id}">
                <td class="td-check"><input type="checkbox" class="row-check" data-id="${p.id}"></td>
                <td><img src="${p.img}" class="table-thumb" alt="" onerror="this.style.display='none'"></td>
                <td>
                    <div class="table-title">${escHtml(p.titleEn)}</div>
                    <div class="table-subtitle">${escHtml(p.titleKa || '')}</div>
                </td>
                <td><span class="badge cat-badge">${catLabel}</span></td>
                <td>
                    <div>${paintLabel}</div>
                    <div class="table-subtitle">${matLabel}</div>
                </td>
                <td>${sizeLabel}</td>
                <td>${p.price != null ? '$' + p.price : '—'}</td>
                <td><span class="badge ${p.sold ? 'sold-badge' : 'available'}">${p.sold ? 'Sold' : 'Available'}</span></td>
                <td>
                    <div class="table-actions">
                        <button class="edit-btn" data-id="${p.id}">Edit</button>
                        <button class="delete-btn" data-id="${p.id}">Delete</button>
                    </div>
                </td>
            </tr>`;
        }).join('');

        // Reset select-all checkbox
        $('selectAll').checked = false;
        updateBulkToolbar();
    }

    function escHtml(s) {
        const d = document.createElement('div');
        d.textContent = s;
        return d.innerHTML;
    }
    function capitalize(s) {
        return s ? s.charAt(0).toUpperCase() + s.slice(1).replace('-', ' ') : '';
    }

    /* ---------- Image Upload ---------- */
    let pendingImage = '';   // base64 or path string

    function initImageUpload() {
        const area = $('imageUploadArea');
        const inp = $('imageInput');
        const preview = $('imagePreview');
        const placeholder = $('uploadPlaceholder');

        area.addEventListener('click', () => inp.click());

        area.addEventListener('dragover', e => { e.preventDefault(); area.classList.add('drag-over'); });
        area.addEventListener('dragleave', () => area.classList.remove('drag-over'));
        area.addEventListener('drop', e => {
            e.preventDefault();
            area.classList.remove('drag-over');
            if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
        });

        inp.addEventListener('change', () => {
            if (inp.files.length) handleFile(inp.files[0]);
        });

        function handleFile(file) {
            if (!file.type.startsWith('image/')) { showToast('Please upload an image'); return; }

            const reader = new FileReader();
            reader.onload = function (ev) {
                pendingImage = ev.target.result;  // base64 data URL
                preview.src = pendingImage;
                preview.style.display = '';
                placeholder.style.display = 'none';
            };
            reader.readAsDataURL(file);
        }
    }

    function resetImageUpload() {
        pendingImage = '';
        $('imagePreview').style.display = 'none';
        $('imagePreview').src = '';
        $('uploadPlaceholder').style.display = '';
        $('imageInput').value = '';
    }

    /* ---------- Form: Add / Edit ---------- */
    let editingId = null;

    function initForm() {
        $('paintingForm').addEventListener('submit', function (e) {
            e.preventDefault();

            const titleEn = $('titleEn').value.trim();
            const titleKa = $('titleKa').value.trim();
            const detailEn = $('detailEn').value.trim();
            const detailKa = $('detailKa').value.trim();
            const category = $('category').value;
            const material = $('material').value;
            const paintType = $('paintType').value;
            const widthCm = parseInt($('widthCm').value, 10);
            const heightCm = parseInt($('heightCm').value, 10);
            const priceRaw = $('price').value.trim();
            const price = priceRaw ? parseInt(priceRaw, 10) : null;
            const sold = $('sold').value === 'true';

            if (!titleEn || !titleKa) { showToast('Please fill in both titles'); return; }
            if (price !== null && (isNaN(price) || price < 0)) { showToast('Enter a valid price or leave empty'); return; }
            if (!widthCm || !heightCm || widthCm < 1 || heightCm < 1) { showToast('Enter valid dimensions in cm'); return; }

            if (editingId !== null) {
                // Update existing
                const updates = { titleEn, titleKa, detailEn, detailKa, category, material, paintType, widthCm, heightCm, price, sold };
                if (pendingImage) updates.img = pendingImage;
                PaintingsDB.update(editingId, updates);
                showToast('Painting updated!');
                cancelEdit();
            } else {
                // Add new
                if (!pendingImage) { showToast('Please upload an image'); return; }
                PaintingsDB.add({
                    titleEn, titleKa, detailEn, detailKa,
                    category, material, paintType,
                    widthCm, heightCm, price, sold,
                    img: pendingImage
                });
                showToast('Painting added!');
                resetForm();
            }

            renderStats();
            renderExcludeChips();
            renderTable();
        });

        $('resetFormBtn').addEventListener('click', () => {
            if (editingId !== null) cancelEdit(); else resetForm();
        });

        $('cancelEditBtn').addEventListener('click', cancelEdit);
    }

    function resetForm() {
        $('paintingForm').reset();
        $('detailEn').value = 'Egg tempera on board, 2025';
        $('detailKa').value = 'კვერცხის ტემპერა ფირფიცარზე, 2025';
        resetImageUpload();
        editingId = null;
        $('editId').value = '';
        $('formTitle').textContent = 'Add New Painting';
        $('submitBtn').innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> Add Painting';
        $('cancelEditBtn').style.display = 'none';
    }

    function startEdit(id) {
        const list = PaintingsDB.getAll();
        const p = list.find(x => x.id === id);
        if (!p) return;

        editingId = id;
        $('editId').value = id;
        $('titleEn').value = p.titleEn || '';
        $('titleKa').value = p.titleKa || '';
        $('detailEn').value = p.detailEn || '';
        $('detailKa').value = p.detailKa || '';
        $('category').value = p.category || 'still-life';
        $('material').value = p.material || 'canvas';
        $('paintType').value = p.paintType || 'oil';
        $('widthCm').value = p.widthCm || '';
        $('heightCm').value = p.heightCm || '';
        $('price').value = p.price != null ? p.price : '';
        $('sold').value = p.sold ? 'true' : 'false';

        // Show current image in preview
        if (p.img) {
            pendingImage = '';  // only set if they choose a new image
            $('imagePreview').src = p.img;
            $('imagePreview').style.display = '';
            $('uploadPlaceholder').style.display = 'none';
        }

        $('formTitle').textContent = 'Edit Painting';
        $('submitBtn').innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg> Save Changes';
        $('cancelEditBtn').style.display = '';

        // Scroll to form
        $('formTitle').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function cancelEdit() {
        editingId = null;
        resetForm();
    }

    /* ---------- Delete ---------- */
    let deleteTargetId = null;

    function initDelete() {
        $('confirmDelete').addEventListener('click', () => {
            if (deleteTargetId !== null) {
                PaintingsDB.remove(deleteTargetId);
                showToast('Painting deleted');
                deleteTargetId = null;
                $('deleteModal').style.display = 'none';
                renderStats();
                renderTable();
            }
        });
        $('cancelDelete').addEventListener('click', () => {
            $('deleteModal').style.display = 'none';
            deleteTargetId = null;
        });
    }

    function promptDelete(id) {
        const list = PaintingsDB.getAll();
        const p = list.find(x => x.id === id);
        if (!p) return;
        deleteTargetId = id;
        $('deleteMsg').textContent = `Delete "${p.titleEn}"? This cannot be undone.`;
        $('deleteModal').style.display = '';
    }

    /* ---------- Table Delegation ---------- */
    function initTableActions() {
        $('paintingsTableBody').addEventListener('click', function (e) {
            const btn = e.target.closest('button');
            if (!btn) return;
            const id = btn.dataset.id;  // string IDs like 'p1', 'p1234567890'
            if (btn.classList.contains('edit-btn')) startEdit(id);
            if (btn.classList.contains('delete-btn')) promptDelete(id);
        });
    }

    /* ---------- Reset Data ---------- */
    function initResetData() {
        $('resetDataBtn').addEventListener('click', () => {
            if (confirm('Reset all paintings to the original defaults? Any added paintings will be lost.')) {
                localStorage.removeItem('paintings_db');
                PaintingsDB.getAll(); // re-seed from defaults
                renderStats();
                renderTable();
                cancelEdit();
                showToast('Data reset to defaults');
            }
        });
    }

    /* ---------- Password Change ---------- */
    function initPasswordChange() {
        $('changePassBtn').addEventListener('click', () => {
            $('passModal').style.display = '';
        });
        $('closePassModal').addEventListener('click', () => {
            $('passModal').style.display = 'none';
            $('passForm').reset();
        });
        $('passForm').addEventListener('submit', function (e) {
            e.preventDefault();
            const curr = $('currentPass').value.trim();
            const newP = $('newPass').value.trim();
            if (curr !== getPassword()) {
                showToast('Current password is wrong');
                return;
            }
            if (newP.length < 4) {
                showToast('New password must be at least 4 characters');
                return;
            }
            setPassword(newP);
            $('passModal').style.display = 'none';
            $('passForm').reset();
            showToast('Password changed!');
        });
    }

    /* ---------- Logout ---------- */
    function initLogout() {
        $('logoutBtn').addEventListener('click', () => {
            logout();
            location.reload();
        });
    }

    /* ---------- Publish / Export Data ---------- */
    function initPublish() {
        $('publishBtn').addEventListener('click', publishChanges);
    }

    async function publishChanges() {
        const btn = $('publishBtn');
        const origHTML = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg> Publishing...';

        try {
            const { paintingsJs, paintingsJson } = generateAllData();
            const resp = await fetch('/api/save-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    password: getPassword(),
                    paintingsJs,
                    paintingsJson
                })
            });
            const result = await resp.json();
            if (!resp.ok) throw new Error(result.error || 'Server error');

            btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Published!';
            showToast('Published! Site will update in ~1 minute.');

            // Sync localStorage version to match what we just published
            // so next getAll() won't fight with stale version numbers
            try {
                const curVer = parseInt(localStorage.getItem('paintings_db_version') || '7', 10);
                localStorage.setItem('paintings_db_version', String(curVer + 1));
            } catch(e) { /* ignore */ }

            // Notify search engines via IndexNow (Bing/Yandex instant indexing)
            try {
                const ids = PaintingsDB.getAll().map(p => p.id);
                fetch('/api/indexnow', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ paintingIds: ids })
                }).catch(() => {});
            } catch(e) { /* non-critical */ }
        } catch (err) {
            showToast('Publish failed: ' + err.message);
            btn.innerHTML = origHTML;
        } finally {
            btn.disabled = false;
            setTimeout(() => { btn.innerHTML = origHTML; }, 4000);
        }
    }

    function generateAllData() {
        const paintings = PaintingsDB.getAll();
        const customCats = PaintingsDB.getCustomCategories();
        const builtInCats = PaintingsDB.builtInCategories;

        // Build custom categories array source
        let customCatsSrc = '';
        if (customCats.length > 0) {
            customCatsSrc = customCats.map(c =>
                `        { id: '${c.id}', en: '${esc(c.en)}', ka: '${esc(c.ka)}', builtin: false }`
            ).join(',\n');
        }

        // Build paintings array source
        const paintingsSrc = paintings.map(p => {
            const fields = [
                `            id: '${esc(p.id)}'`,
                `            img: '${esc(p.img)}'`,
                `            titleEn: "${esc(p.titleEn)}"`,
                `            titleKa: "${esc(p.titleKa)}"`,
                `            detailEn: "${esc(p.detailEn)}"`,
                `            detailKa: "${esc(p.detailKa)}"`,
                `            category: '${esc(p.category)}'`,
                `            price: ${p.price === null ? 'null' : p.price}`,
                `            sold: ${p.sold ? 'true' : 'false'}`,
                `            material: '${esc(p.material || 'board')}'`,
                `            paintType: '${esc(p.paintType || 'tempera')}'`,
                `            widthCm: ${p.widthCm || 60}`,
                `            heightCm: ${p.heightCm || 80}`,
                `            dateAdded: '${esc(p.dateAdded || '2025-01-01')}'`
            ];
            return `        {\n${fields.join(',\n')}\n        }`;
        }).join(',\n');

        // Get current DATA_VERSION and increment
        const currentVersion = parseInt(localStorage.getItem('paintings_db_version') || '7', 10);
        const newVersion = currentVersion + 1;

        const jsContent = `/* ========================================
   David Khidasheli — Paintings Data Store
   Shared between main site and admin panel
   ======================================== */

const PaintingsDB = (function () {
    'use strict';

    const STORAGE_KEY = 'paintings_db';
    const DATA_VERSION = ${newVersion}; // Bump forces full reset of localStorage data

    const defaultPaintings = [
${paintingsSrc}
    ];

    function getAll() {
        const storedVersion = parseInt(localStorage.getItem(STORAGE_KEY + '_version') || '0', 10);

        // If data version has increased, reset to new defaults
        // (replaces old data — categories changed, paintings added/removed)
        if (storedVersion < DATA_VERSION) {
            save([...defaultPaintings]);
            localStorage.setItem(STORAGE_KEY + '_version', String(DATA_VERSION));
            return [...defaultPaintings];
        }

        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                return [...defaultPaintings];
            }
        }
        // First run — seed with defaults
        save(defaultPaintings);
        return [...defaultPaintings];
    }

    function save(paintings) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(paintings));
            return true;
        } catch (e) {
            console.error('Failed to save paintings:', e);
            return false;
        }
    }

    function add(painting) {
        const all = getAll();
        painting.id = 'p' + Date.now();
        painting.dateAdded = new Date().toISOString().split('T')[0];
        all.push(painting);
        save(all);
        return painting;
    }

    function update(id, updates) {
        const all = getAll();
        const idx = all.findIndex(p => p.id === id);
        if (idx !== -1) {
            all[idx] = { ...all[idx], ...updates };
            save(all);
            return all[idx];
        }
        return null;
    }

    function remove(id) {
        const all = getAll();
        const filtered = all.filter(p => p.id !== id);
        save(filtered);
        return filtered;
    }

    function removeMultiple(ids) {
        const idSet = new Set(ids);
        const all = getAll();
        const filtered = all.filter(p => !idSet.has(p.id));
        save(filtered);
        return filtered;
    }

    function updateMultiple(ids, updates) {
        const idSet = new Set(ids);
        const all = getAll();
        all.forEach(p => {
            if (idSet.has(p.id)) Object.assign(p, updates);
        });
        save(all);
        return all;
    }

    function getById(id) {
        return getAll().find(p => p.id === id) || null;
    }

    function getCategories() {
        const all = getAll();
        return [...new Set(all.map(p => p.category))];
    }

    function resetToDefaults() {
        save([...defaultPaintings]);
        localStorage.setItem(STORAGE_KEY + '_version', String(DATA_VERSION));
        return [...defaultPaintings];
    }

    /* ---------- Custom Categories (series / collections) ---------- */
    const CAT_STORAGE_KEY = 'custom_categories';

    // Built-in categories that always exist
    const builtInCategories = [
        { id: 'for-sale', en: 'For Sale', ka: '\\u10d2\\u10d0\\u10e1\\u10d0\\u10e7\\u10d8\\u10d3\\u10d8', builtin: true },
        { id: '2021',     en: '2021',     ka: '2021',     builtin: true },
        { id: '2022',     en: '2022',     ka: '2022',     builtin: true },
        { id: '2023',     en: '2023',     ka: '2023',     builtin: true },
        { id: '2024',     en: '2024',     ka: '2024',     builtin: true },
        { id: '2025',     en: '2025',     ka: '2025',     builtin: true },
        { id: '2026',     en: '2026',     ka: '2026',     builtin: true }
    ];

    function getCustomCategories() {
        // Default custom categories (exported from admin)
        const defaultCustom = [
${customCatsSrc}
        ];
        try {
            const stored = JSON.parse(localStorage.getItem(CAT_STORAGE_KEY) || 'null');
            // If nothing stored yet, use defaults
            if (!stored) {
                localStorage.setItem(CAT_STORAGE_KEY, JSON.stringify(defaultCustom));
                return [...defaultCustom];
            }
            return stored;
        } catch (e) {
            return [...defaultCustom];
        }
    }

    function saveCustomCategories(cats) {
        localStorage.setItem(CAT_STORAGE_KEY, JSON.stringify(cats));
    }

    function addCustomCategory(en, ka) {
        const cats = getCustomCategories();
        const id = en.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        if (!id) return null;
        const allIds = builtInCategories.map(c => c.id).concat(cats.map(c => c.id));
        if (allIds.includes(id)) return null;
        const newCat = { id, en, ka, builtin: false };
        cats.push(newCat);
        saveCustomCategories(cats);
        return newCat;
    }

    function removeCustomCategory(id) {
        const cats = getCustomCategories().filter(c => c.id !== id);
        saveCustomCategories(cats);
        return cats;
    }

    function getAllCategories() {
        return [...builtInCategories, ...getCustomCategories()];
    }

    function getCategoryLabel(catId) {
        const all = getAllCategories();
        const found = all.find(c => c.id === catId);
        return found ? { en: found.en, ka: found.ka } : { en: catId, ka: catId };
    }

    return {
        getAll,
        add,
        update,
        remove,
        removeMultiple,
        updateMultiple,
        getById,
        getCategories,
        resetToDefaults,
        defaultPaintings,
        getAllCategories,
        getCustomCategories,
        addCustomCategory,
        removeCustomCategory,
        getCategoryLabel,
        builtInCategories
    };
})();
`;

        // Also generate paintings.json for serverless
        const jsonObj = {};
        paintings.forEach(p => { jsonObj[p.id] = p; });
        const jsonContent = JSON.stringify(jsonObj, null, 2);

        return { paintingsJs: jsContent, paintingsJson: jsonContent };
    }

    function esc(s) {
        return String(s || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\n/g, '\\n');
    }

    function downloadFile(filename, content, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    }

    /* ---------- Bulk Categorize ---------- */
    function getSelectedIds() {
        const checks = document.querySelectorAll('.row-check:checked');
        return Array.from(checks).map(c => c.dataset.id);
    }

    function updateBulkToolbar() {
        const ids = getSelectedIds();
        const toolbar = $('bulkToolbar');
        if (ids.length > 0) {
            toolbar.style.display = '';
            $('bulkCount').textContent = ids.length;
        } else {
            toolbar.style.display = 'none';
        }
    }

    function initBulkActions() {
        // Select-all checkbox
        $('selectAll').addEventListener('change', function () {
            document.querySelectorAll('.row-check').forEach(c => { c.checked = this.checked; });
            updateBulkToolbar();
        });

        // Individual checkbox changes (delegated)
        $('paintingsTableBody').addEventListener('change', function (e) {
            if (e.target.classList.contains('row-check')) {
                updateBulkToolbar();
                // If not all are checked, uncheck select-all
                const all = document.querySelectorAll('.row-check');
                const checked = document.querySelectorAll('.row-check:checked');
                $('selectAll').checked = all.length > 0 && all.length === checked.length;
            }
        });

        // Apply bulk category (efficient single save)
        $('bulkApplyBtn').addEventListener('click', function () {
            const ids = getSelectedIds();
            if (ids.length === 0) { showToast('No paintings selected'); return; }
            const newCat = $('bulkCategory').value;
            if (typeof PaintingsDB.updateMultiple === 'function') {
                PaintingsDB.updateMultiple(ids, { category: newCat });
            } else {
                ids.forEach(id => PaintingsDB.update(id, { category: newCat }));
            }

            // Verify save actually persisted
            const verify = PaintingsDB.getAll();
            const movedOk = ids.every(id => {
                const p = verify.find(x => x.id === id);
                return p && p.category === newCat;
            });

            if (!movedOk) {
                showToast('Error: changes may not have saved. Try again or reduce data size.');
                console.error('Bulk move verification failed — localStorage may be full');
                return;
            }

            // Auto-unexclude the target category so moved paintings stay visible
            if (excludedCategories.has(newCat)) {
                excludedCategories.delete(newCat);
            }

            const catLabel = newCat === 'for-sale' ? 'For Sale' : (PaintingsDB.getCategoryLabel(newCat).en || newCat);
            showToast(`${ids.length} painting(s) moved to "${catLabel}"`);
            $('selectAll').checked = false;
            renderStats();
            renderExcludeChips();
            renderTable();
        });

        // Bulk mark sold
        $('bulkSoldBtn').addEventListener('click', function () {
            const ids = getSelectedIds();
            if (ids.length === 0) { showToast('No paintings selected'); return; }
            if (typeof PaintingsDB.updateMultiple === 'function') {
                PaintingsDB.updateMultiple(ids, { sold: true });
            } else {
                ids.forEach(id => PaintingsDB.update(id, { sold: true }));
            }
            showToast(`${ids.length} painting(s) marked as Sold`);
            $('selectAll').checked = false;
            renderStats();
            renderTable();
        });

        // Bulk mark available
        $('bulkAvailableBtn').addEventListener('click', function () {
            const ids = getSelectedIds();
            if (ids.length === 0) { showToast('No paintings selected'); return; }
            if (typeof PaintingsDB.updateMultiple === 'function') {
                PaintingsDB.updateMultiple(ids, { sold: false });
            } else {
                ids.forEach(id => PaintingsDB.update(id, { sold: false }));
            }
            showToast(`${ids.length} painting(s) marked as Available`);
            $('selectAll').checked = false;
            renderStats();
            renderTable();
        });

        // Bulk set size
        $('bulkSizeBtn').addEventListener('click', function () {
            const ids = getSelectedIds();
            if (ids.length === 0) { showToast('No paintings selected'); return; }
            const w = parseInt($('bulkWidth').value, 10);
            const h = parseInt($('bulkHeight').value, 10);
            if (!w && !h) { showToast('Enter width, height, or both'); return; }
            const updates = {};
            if (w && w > 0) updates.widthCm = w;
            if (h && h > 0) updates.heightCm = h;
            if (typeof PaintingsDB.updateMultiple === 'function') {
                PaintingsDB.updateMultiple(ids, updates);
            } else {
                ids.forEach(id => PaintingsDB.update(id, updates));
            }
            const sizeStr = (w && h) ? `${w}×${h} cm` : (w ? `width ${w} cm` : `height ${h} cm`);
            showToast(`${ids.length} painting(s) set to ${sizeStr}`);
            $('bulkWidth').value = '';
            $('bulkHeight').value = '';
            $('selectAll').checked = false;
            renderStats();
            renderTable();
        });

        // Bulk clear description + size
        $('bulkClearDescBtn').addEventListener('click', function () {
            const ids = getSelectedIds();
            if (ids.length === 0) { showToast('No paintings selected'); return; }
            if (!confirm(`Clear description and size from ${ids.length} painting(s)?`)) return;
            if (typeof PaintingsDB.updateMultiple === 'function') {
                PaintingsDB.updateMultiple(ids, { detailEn: '', detailKa: '', widthCm: null, heightCm: null });
            } else {
                ids.forEach(id => PaintingsDB.update(id, { detailEn: '', detailKa: '', widthCm: null, heightCm: null }));
            }
            showToast(`Description & size cleared from ${ids.length} painting(s)`);
            $('selectAll').checked = false;
            renderStats();
            renderTable();
        });

        // Bulk delete
        $('bulkDeleteBtn').addEventListener('click', function () {
            const ids = getSelectedIds();
            if (ids.length === 0) { showToast('No paintings selected'); return; }
            if (!confirm(`Delete ${ids.length} painting(s)? This cannot be undone.`)) return;
            if (typeof PaintingsDB.removeMultiple === 'function') {
                PaintingsDB.removeMultiple(ids);
            } else {
                ids.forEach(id => PaintingsDB.remove(id));
            }
            showToast(`${ids.length} painting(s) deleted`);
            $('selectAll').checked = false;
            renderStats();
            renderExcludeChips();
            renderTable();
        });

        // Clear selection
        $('bulkClearBtn').addEventListener('click', function () {
            document.querySelectorAll('.row-check').forEach(c => { c.checked = false; });
            $('selectAll').checked = false;
            updateBulkToolbar();
        });
    }

    /* ---------- Category Filter ---------- */
    function initCategoryFilter() {
        $('filterCategory').addEventListener('change', function () {
            adminFilter = this.value;
            renderTable();
        });
    }

    /* ---------- Exclude Categories ---------- */
    function renderExcludeChips() {
        const cats = PaintingsDB.getAllCategories();
        const paintings = PaintingsDB.getAll();
        const container = $('excludeChips');
        container.innerHTML = cats.map(c => {
            const count = paintings.filter(p => p.category === c.id).length;
            const active = excludedCategories.has(c.id);
            return `<button class="exclude-chip${active ? ' excluded' : ''}" data-cat="${c.id}">
                ${escHtml(c.en)} <span class="exclude-chip-count">${count}</span>
            </button>`;
        }).join('');

        $('excludeClearBtn').style.display = excludedCategories.size > 0 ? '' : 'none';
    }

    function initExcludeBar() {
        $('excludeChips').addEventListener('click', function (e) {
            const chip = e.target.closest('.exclude-chip');
            if (!chip) return;
            const catId = chip.dataset.cat;
            if (excludedCategories.has(catId)) {
                excludedCategories.delete(catId);
            } else {
                excludedCategories.add(catId);
            }
            renderExcludeChips();
            renderTable();
        });

        $('excludeClearBtn').addEventListener('click', function () {
            excludedCategories.clear();
            renderExcludeChips();
            renderTable();
        });

        renderExcludeChips();
    }

    /* ---------- Category Dropdowns (dynamic) ---------- */
    function buildCategoryOptions(includeAll) {
        const cats = PaintingsDB.getAllCategories();
        let html = '';
        if (includeAll) {
            html += '<option value="all">All Categories</option>';
        }
        cats.forEach(c => {
            const label = c.builtin && c.id !== 'for-sale' ? c.en : `${c.en} / ${c.ka}`;
            html += `<option value="${c.id}">${label}</option>`;
        });
        return html;
    }

    function refreshCategoryDropdowns() {
        // Form category select
        const formCat = $('category');
        const prevFormVal = formCat.value;
        formCat.innerHTML = buildCategoryOptions(false);
        if (prevFormVal) formCat.value = prevFormVal;

        // Filter category select
        const filterCat = $('filterCategory');
        const prevFilterVal = filterCat.value;
        filterCat.innerHTML = buildCategoryOptions(true);
        if (prevFilterVal) filterCat.value = prevFilterVal;

        // Bulk category select
        const bulkCat = $('bulkCategory');
        const prevBulkVal = bulkCat.value;
        bulkCat.innerHTML = buildCategoryOptions(false);
        if (prevBulkVal) bulkCat.value = prevBulkVal;

        // Refresh exclude chips
        renderExcludeChips();
    }

    /* ---------- Category Manager ---------- */
    function renderCategoryList() {
        const allCats = PaintingsDB.getAllCategories();
        const paintings = PaintingsDB.getAll();
        const el = $('catList');

        el.innerHTML = allCats.map(c => {
            const count = paintings.filter(p => p.category === c.id).length;
            const deleteBtn = c.builtin
                ? ''
                : `<button class="cat-delete-btn" data-id="${c.id}" title="Delete category">&times;</button>`;
            const builtinTag = c.builtin ? '<span class="cat-builtin">built-in</span>' : '';
            return `<div class="cat-item">
                <div class="cat-item-info">
                    <span class="cat-item-name">${escHtml(c.en)}</span>
                    <span class="cat-item-ka">${escHtml(c.ka)}</span>
                    ${builtinTag}
                </div>
                <span class="cat-item-count">${count}</span>
                ${deleteBtn}
            </div>`;
        }).join('');
    }

    function initCategoryManager() {
        // Add category
        $('addCatBtn').addEventListener('click', function () {
            const en = $('newCatEn').value.trim();
            const ka = $('newCatKa').value.trim();
            if (!en) { showToast('Enter English name'); return; }
            if (!ka) { showToast('Enter Georgian name'); return; }
            const result = PaintingsDB.addCustomCategory(en, ka);
            if (!result) { showToast('Category already exists or invalid name'); return; }
            $('newCatEn').value = '';
            $('newCatKa').value = '';
            renderCategoryList();
            refreshCategoryDropdowns();
            showToast(`Category "${en}" added!`);
        });

        // Delete category (delegated)
        $('catList').addEventListener('click', function (e) {
            const btn = e.target.closest('.cat-delete-btn');
            if (!btn) return;
            const id = btn.dataset.id;
            // Check if any paintings use this category
            const paintings = PaintingsDB.getAll();
            const count = paintings.filter(p => p.category === id).length;
            let msg = `Delete category "${id}"?`;
            if (count > 0) {
                msg += ` ${count} painting(s) use this category — they will keep the category value but it won't appear as a filter until re-created.`;
            }
            if (confirm(msg)) {
                PaintingsDB.removeCustomCategory(id);
                renderCategoryList();
                refreshCategoryDropdowns();
                showToast('Category deleted');
            }
        });

        // Allow Enter key in inputs
        $('newCatEn').addEventListener('keydown', function (e) {
            if (e.key === 'Enter') { e.preventDefault(); $('addCatBtn').click(); }
        });
        $('newCatKa').addEventListener('keydown', function (e) {
            if (e.key === 'Enter') { e.preventDefault(); $('addCatBtn').click(); }
        });
    }

    /* ---------- Init ---------- */
    function init() {
        initLogin();
        initImageUpload();
        initForm();
        initDelete();
        initTableActions();
        initBulkActions();
        initCategoryFilter();
        initExcludeBar();
        initCategoryManager();
        initPublish();
        initResetData();
        initPasswordChange();
        initLogout();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
