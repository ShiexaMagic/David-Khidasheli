/* ================================================
   Vercel Serverless Function — Save gallery data
   Commits paintings-data.js + paintings.json to GitHub
   so Vercel auto-deploys the changes.
   ================================================ */

const https = require('https');

const OWNER = 'ShiexaMagic';
const REPO = 'David-Khidasheli';
const BRANCH = 'main';

module.exports = async (req, res) => {
    // CORS for admin panel
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const ADMIN_SECRET = process.env.ADMIN_SECRET;

    if (!GITHUB_TOKEN || !ADMIN_SECRET) {
        return res.status(500).json({
            error: 'Server not configured. Add GITHUB_TOKEN and ADMIN_SECRET in Vercel Environment Variables.'
        });
    }

    let body;
    try {
        body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch (e) {
        return res.status(400).json({ error: 'Invalid JSON body' });
    }

    const { password, paintingsJs, paintingsJson } = body;

    if (!password || password !== ADMIN_SECRET) {
        return res.status(401).json({ error: 'Wrong password' });
    }

    if (!paintingsJs || !paintingsJson) {
        return res.status(400).json({ error: 'Missing paintingsJs or paintingsJson data' });
    }

    try {
        // 1. Get the latest commit on main
        const ref = await gh('GET', `/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`);
        const latestCommitSha = ref.object.sha;

        // 2. Get the tree of that commit
        const latestCommit = await gh('GET', `/repos/${OWNER}/${REPO}/git/commits/${latestCommitSha}`);
        const baseTreeSha = latestCommit.tree.sha;

        // 3. Create blobs for both files
        const [jsBlob, jsonBlob] = await Promise.all([
            gh('POST', `/repos/${OWNER}/${REPO}/git/blobs`, {
                content: Buffer.from(paintingsJs, 'utf8').toString('base64'),
                encoding: 'base64'
            }),
            gh('POST', `/repos/${OWNER}/${REPO}/git/blobs`, {
                content: Buffer.from(paintingsJson, 'utf8').toString('base64'),
                encoding: 'base64'
            })
        ]);

        // 4. Create a new tree with both file changes
        const newTree = await gh('POST', `/repos/${OWNER}/${REPO}/git/trees`, {
            base_tree: baseTreeSha,
            tree: [
                { path: 'js/paintings-data.js', mode: '100644', type: 'blob', sha: jsBlob.sha },
                { path: 'api/painting/paintings.json', mode: '100644', type: 'blob', sha: jsonBlob.sha }
            ]
        });

        // 5. Create a new commit
        const newCommit = await gh('POST', `/repos/${OWNER}/${REPO}/git/commits`, {
            message: 'Update gallery data from admin panel',
            tree: newTree.sha,
            parents: [latestCommitSha]
        });

        // 6. Update the branch reference to point to the new commit
        await gh('PATCH', `/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`, {
            sha: newCommit.sha
        });

        return res.status(200).json({
            success: true,
            message: 'Published! Vercel will deploy in ~1 minute.',
            commitSha: newCommit.sha
        });
    } catch (err) {
        console.error('GitHub API error:', err);
        return res.status(500).json({
            error: err.message || 'Failed to publish. Check Vercel logs.'
        });
    }
};

/**
 * Make a request to the GitHub API
 */
function gh(method, path, body) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.github.com',
            path: path,
            method: method,
            headers: {
                'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github+json',
                'User-Agent': 'David-Khidasheli-Admin',
                'X-GitHub-Api-Version': '2022-11-28'
            }
        };

        if (body) {
            options.headers['Content-Type'] = 'application/json';
        }

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (res.statusCode >= 400) {
                        reject(new Error(`GitHub ${res.statusCode}: ${parsed.message || JSON.stringify(parsed)}`));
                    } else {
                        resolve(parsed);
                    }
                } catch (e) {
                    reject(new Error(`Invalid GitHub response (${res.statusCode}): ${data.substring(0, 300)}`));
                }
            });
        });

        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}
