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

    const options = {
        hostname: 'api.indexnow.org',
        path: '/indexnow',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
        }
    };

    return new Promise((resolve) => {
        const request = https.request(options, (response) => {
            let body = '';
            response.on('data', chunk => { body += chunk; });
            response.on('end', () => {
                res.status(200).json({
                    submitted: urls.length,
                    indexNowStatus: response.statusCode,
                    message: response.statusCode === 200 || response.statusCode === 202
                        ? 'URLs submitted to IndexNow (Bing/Yandex)'
                        : 'IndexNow returned: ' + body
                });
                resolve();
            });
        });

        request.on('error', (err) => {
            res.status(200).json({ submitted: urls.length, error: err.message });
            resolve();
        });

        request.write(payload);
        request.end();
    });
};
