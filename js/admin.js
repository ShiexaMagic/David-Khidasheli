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
                <div class="stat-value">₾${totalValue.toLocaleString()}</div>
            </div>
        `;
    }

    /* ---------- Table ---------- */
    let adminFilter = 'all';  // category filter for admin table

    function renderTable() {
        let list = PaintingsDB.getAll();
        if (adminFilter !== 'all') {
            list = list.filter(p => p.category === adminFilter);
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
                <td>${p.price != null ? '₾' + p.price : '—'}</td>
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
            renderTable();
        });

        $('resetFormBtn').addEventListener('click', () => {
            if (editingId !== null) cancelEdit(); else resetForm();
        });

        $('cancelEditBtn').addEventListener('click', cancelEdit);
    }

    function resetForm() {
        $('paintingForm').reset();
        $('detailEn').value = 'Oil on canvas, 2025';
        $('detailKa').value = 'ზეთი ტილოზე, 2025';
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

        // Apply bulk category
        $('bulkApplyBtn').addEventListener('click', function () {
            const ids = getSelectedIds();
            if (ids.length === 0) { showToast('No paintings selected'); return; }
            const newCat = $('bulkCategory').value;
            ids.forEach(id => {
                PaintingsDB.update(id, { category: newCat });
            });
            showToast(`${ids.length} painting(s) moved to "${newCat === 'for-sale' ? 'For Sale' : newCat}"`);
            $('selectAll').checked = false;
            renderStats();
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
        initCategoryManager();
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
