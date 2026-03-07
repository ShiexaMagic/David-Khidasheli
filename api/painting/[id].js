/* ================================================
   Vercel Serverless Function — OG meta for paintings
   Serves proper Open Graph tags for social media crawlers
   and redirects real users to the SPA detail view.
   ================================================ */

const path = require('path');
const fs = require('fs');

const SITE = 'https://www.davidkhidasheli.art';

const materialNames = {
    board: 'Board', canvas: 'Canvas', paper: 'Paper', wood: 'Wood',
    cardboard: 'Cardboard', linen: 'Linen'
};
const paintNames = {
    tempera: 'Egg Tempera', oil: 'Oil', acrylic: 'Acrylic', watercolor: 'Watercolor',
    gouache: 'Gouache', pastel: 'Pastel', mixed: 'Mixed Media'
};

// Load paintings data from JSON file
const paintingsPath = path.join(__dirname, 'paintings.json');
const paintings = JSON.parse(fs.readFileSync(paintingsPath, 'utf8'));

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
