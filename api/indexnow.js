/* IndexNow API — submit URLs to Bing/Yandex for instant indexing */
const https = require('https');

const INDEXNOW_KEY = '046fc37264694933b3519904de7b08b5';
const SITE = 'https://www.davidkhidasheli.art';

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'POST only' });
        return;
    }

    const urls = [
        SITE + '/',
        ...(req.body?.paintingIds || []).map(id => `${SITE}/painting/${id}`)
    ];

    const payload = JSON.stringify({
        host: 'www.davidkhidasheli.art',
        key: INDEXNOW_KEY,
        keyLocation: `${SITE}/${INDEXNOW_KEY}.txt`,
        urlList: urls.slice(0, 10000) // IndexNow limit
    });

    // Submit to multiple engines in parallel
    const engines = [
        { name: 'Bing',   hostname: 'www.bing.com',                path: '/indexnow' },
        { name: 'Yandex', hostname: 'yandex.com',                  path: '/indexnow' },
        { name: 'Naver',  hostname: 'searchadvisor.naver.com',     path: '/indexnow' }
    ];

    const results = await Promise.allSettled(engines.map(engine => {
        return new Promise((resolve, reject) => {
            const opts = {
                hostname: engine.hostname,
                path: engine.path,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json; charset=utf-8',
                    'Content-Length': Buffer.byteLength(payload)
                }
            };
            const request = https.request(opts, (response) => {
                let body = '';
                response.on('data', chunk => { body += chunk; });
                response.on('end', () => resolve({ engine: engine.name, status: response.statusCode }));
            });
            request.on('error', (err) => resolve({ engine: engine.name, error: err.message }));
            request.write(payload);
            request.end();
        });
    }));

    res.status(200).json({
        submitted: urls.length,
        engines: results.map(r => r.value || r.reason)
    });
};
