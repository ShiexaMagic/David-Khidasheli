/* ========================================
   David Khidasheli — Paintings Data Store
   Shared between main site and admin panel
   ======================================== */

const PaintingsDB = (function () {
    'use strict';

    const STORAGE_KEY = 'paintings_db';

    // Default paintings (the original 9)
    const defaultPaintings = [
        {
            id: 'p1',
            img: 'images/dat.png',
            titleEn: 'Pink Roses in Green Pitcher',
            titleKa: 'ვარდისფერი ვარდები მწვანე დოქში',
            detailEn: 'Oil on canvas, 2025',
            detailKa: 'ზეთი ტილოზე, 2025',
            category: 'still-life',
            price: 450,
            sold: false,
            material: 'canvas',
            paintType: 'oil',
            widthCm: 50,
            heightCm: 70,
            dateAdded: '2025-01-01'
        },
        {
            id: 'p2',
            img: 'images/DSCF7794.jpg',
            titleEn: 'Golden Garden',
            titleKa: 'ოქროსფერი ბაღი',
            detailEn: 'Oil on canvas, 2025',
            detailKa: 'ზეთი ტილოზე, 2025',
            category: 'landscape',
            price: 600,
            sold: false,
            material: 'canvas',
            paintType: 'oil',
            widthCm: 80,
            heightCm: 60,
            dateAdded: '2025-01-02'
        },
        {
            id: 'p3',
            img: 'images/DSCF7801.jpg',
            titleEn: 'Autumn Vista',
            titleKa: 'შემოდგომის ხედი',
            detailEn: 'Oil on canvas, 2025',
            detailKa: 'ზეთი ტილოზე, 2025',
            category: 'landscape',
            price: 650,
            sold: false,
            material: 'canvas',
            paintType: 'oil',
            widthCm: 90,
            heightCm: 60,
            dateAdded: '2025-01-03'
        },
        {
            id: 'p4',
            img: 'images/SHI04125.jpg',
            titleEn: 'Daisies and Roses',
            titleKa: 'გვირილა და ვარდები',
            detailEn: 'Oil on canvas, 2025',
            detailKa: 'ზეთი ტილოზე, 2025',
            category: 'still-life',
            price: 400,
            sold: false,
            material: 'canvas',
            paintType: 'oil',
            widthCm: 50,
            heightCm: 60,
            dateAdded: '2025-01-04'
        },
        {
            id: 'p5',
            img: 'images/SHI04131.jpg',
            titleEn: 'The Lion',
            titleKa: 'ლომი',
            detailEn: 'Oil on canvas, 2025',
            detailKa: 'ზეთი ტილოზე, 2025',
            category: 'animal',
            price: 800,
            sold: false,
            material: 'canvas',
            paintType: 'oil',
            widthCm: 100,
            heightCm: 80,
            dateAdded: '2025-01-05'
        },
        {
            id: 'p6',
            img: 'images/SHI041333.jpg',
            titleEn: 'The Pelican',
            titleKa: 'ვარხვი',
            detailEn: 'Oil on canvas, 2025',
            detailKa: 'ზეთი ტილოზე, 2025',
            category: 'animal',
            price: 750,
            sold: false,
            material: 'canvas',
            paintType: 'oil',
            widthCm: 70,
            heightCm: 90,
            dateAdded: '2025-01-06'
        },
        {
            id: 'p7',
            img: 'images/SHI04134.jpg',
            titleEn: 'Daisies and Roses II',
            titleKa: 'გვირილა და ვარდები II',
            detailEn: 'Oil on canvas, 2025',
            detailKa: 'ზეთი ტილოზე, 2025',
            category: 'still-life',
            price: 400,
            sold: false,
            material: 'canvas',
            paintType: 'oil',
            widthCm: 50,
            heightCm: 60,
            dateAdded: '2025-01-07'
        },
        {
            id: 'p8',
            img: 'images/SHI04137.jpg',
            titleEn: 'Red Roses in White Pitcher',
            titleKa: 'წითელი ვარდები თეთრ დოქში',
            detailEn: 'Oil on canvas, 2025',
            detailKa: 'ზეთი ტილოზე, 2025',
            category: 'still-life',
            price: 500,
            sold: false,
            material: 'canvas',
            paintType: 'oil',
            widthCm: 60,
            heightCm: 80,
            dateAdded: '2025-01-08'
        },
        {
            id: 'p9',
            img: 'images/SHI041e37.jpg',
            titleEn: 'Red Zinnias',
            titleKa: 'წითელი ცინიები',
            detailEn: 'Oil on canvas, 2025',
            detailKa: 'ზეთი ტილოზე, 2025',
            category: 'still-life',
            price: 550,
            sold: false,
            material: 'canvas',
            paintType: 'oil',
            widthCm: 55,
            heightCm: 65,
            dateAdded: '2025-01-09'
        }
    ];

    function getAll() {
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
        localStorage.setItem(STORAGE_KEY, JSON.stringify(paintings));
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

    function getById(id) {
        return getAll().find(p => p.id === id) || null;
    }

    function getCategories() {
        const all = getAll();
        return [...new Set(all.map(p => p.category))];
    }

    function resetToDefaults() {
        save([...defaultPaintings]);
        return [...defaultPaintings];
    }

    return {
        getAll,
        add,
        update,
        remove,
        getById,
        getCategories,
        resetToDefaults,
        defaultPaintings
    };
})();
