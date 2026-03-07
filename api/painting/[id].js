/* ================================================
   Vercel Serverless Function — OG meta for paintings
   Serves proper Open Graph tags for social media crawlers
   and redirects real users to the SPA detail view.
   ================================================ */

const SITE = 'https://www.davidkhidasheli.art';

const materialNames = {
    canvas: 'Canvas', paper: 'Paper', wood: 'Wood',
    cardboard: 'Cardboard', linen: 'Linen'
};
const paintNames = {
    oil: 'Oil', acrylic: 'Acrylic', watercolor: 'Watercolor',
    gouache: 'Gouache', pastel: 'Pastel', mixed: 'Mixed Media'
};

// Default paintings — same data as paintings-data.js
const paintings = {
    p1: { titleEn: 'Pink Roses in Green Pitcher', titleKa: 'ვარდისფერი ვარდები მწვანე დოქში', img: 'images/dat.png', material: 'canvas', paintType: 'oil', widthCm: 50, heightCm: 70, price: 450 },
    p2: { titleEn: 'Golden Garden', titleKa: 'ოქროსფერი ბაღი', img: 'images/DSCF7794.jpg', material: 'canvas', paintType: 'oil', widthCm: 80, heightCm: 60, price: 600 },
    p3: { titleEn: 'Autumn Vista', titleKa: 'შემოდგომის ხედი', img: 'images/DSCF7801.jpg', material: 'canvas', paintType: 'oil', widthCm: 90, heightCm: 60, price: 650 },
    p4: { titleEn: 'Daisies and Roses', titleKa: 'გვირილა და ვარდები', img: 'images/SHI04125.jpg', material: 'canvas', paintType: 'oil', widthCm: 50, heightCm: 60, price: 400 },
    p5: { titleEn: 'The Lion', titleKa: 'ლომი', img: 'images/SHI04131.jpg', material: 'canvas', paintType: 'oil', widthCm: 100, heightCm: 80, price: 800 },
    p6: { titleEn: 'The Pelican', titleKa: 'ვარხვი', img: 'images/SHI041333.jpg', material: 'canvas', paintType: 'oil', widthCm: 70, heightCm: 90, price: 750 },
    p7: { titleEn: 'Daisies and Roses II', titleKa: 'გვირილა და ვარდები II', img: 'images/SHI04134.jpg', material: 'canvas', paintType: 'oil', widthCm: 50, heightCm: 60, price: 400 },
    p8: { titleEn: 'Red Roses in White Pitcher', titleKa: 'წითელი ვარდები თეთრ დოქში', img: 'images/SHI04137.jpg', material: 'canvas', paintType: 'oil', widthCm: 60, heightCm: 80, price: 500 },
    p9: { titleEn: 'Red Zinnias', titleKa: 'წითელი ცინიები', img: 'images/SHI041e37.jpg', material: 'canvas', paintType: 'oil', widthCm: 55, heightCm: 65, price: 550 }
};

function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

module.exports = (req, res) => {
    const { id } = req.query;
    const p = paintings[id];

    // Painting not found — redirect to gallery
    if (!p) {
        res.writeHead(302, { Location: SITE + '/#gallery' });
        res.end();
        return;
    }

    const title = `${p.titleEn} — David Khidasheli`;
    const paintLabel = paintNames[p.paintType] || p.paintType || 'Oil';
    const matLabel = materialNames[p.material] || p.material || 'Canvas';
    const sizeStr = p.widthCm && p.heightCm ? `, ${p.widthCm}×${p.heightCm} cm` : '';
    const description = `${paintLabel} on ${matLabel.toLowerCase()}${sizeStr}${p.price ? ' — ₾' + p.price : ''}. Original painting by Georgian artist David Khidasheli.`;
    const imageUrl = `${SITE}/${p.img}`;
    const pageUrl = `${SITE}/painting/${id}`;
    const spaUrl = `${SITE}/#/painting/${id}`;

    const html = `<!DOCTYPE html>
<html lang="en" prefix="og: https://ogp.me/ns#">
<head>
<meta charset="UTF-8">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">

<!-- Open Graph -->
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${esc(imageUrl)}">
<meta property="og:image:width" content="${p.widthCm ? p.widthCm * 10 : 600}">
<meta property="og:image:height" content="${p.heightCm ? p.heightCm * 10 : 800}">
<meta property="og:url" content="${esc(pageUrl)}">
<meta property="og:site_name" content="David Khidasheli — Art Gallery">

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(imageUrl)}">

<!-- Redirect real users to the SPA (no meta refresh — crawlers follow it) -->
<link rel="canonical" href="${pageUrl}">
<script>window.location.replace("${spaUrl}");</script>
</head>
<body>
<h1>${esc(p.titleEn)}</h1>
<p>${esc(description)}</p>
<img src="${esc(imageUrl)}" alt="${esc(p.titleEn)}" style="max-width:100%">
<p><a href="${spaUrl}">View painting →</a></p>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=600, s-maxage=3600, stale-while-revalidate=60');
    res.status(200).send(html);
};
