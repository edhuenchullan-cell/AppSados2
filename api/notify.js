const crypto = require('crypto');

function base64url(str) {
  return Buffer.from(str).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function getAccessToken() {
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey    = process.env.FIREBASE_PRIVATE_KEY || '';
  // Vercel sometimes wraps the key in quotes — strip them
  if (privateKey.startsWith('"')) privateKey = privateKey.slice(1);
  if (privateKey.endsWith('"'))   privateKey = privateKey.slice(0,-1);
  // Replace literal \n with real newlines
  privateKey = privateKey.replace(/\\n/g, '\n');
  const now = Math.floor(Date.now() / 1000);

  const header  = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64url(JSON.stringify({
    iss:   clientEmail,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud:   'https://oauth2.googleapis.com/token',
    exp:   now + 3600,
    iat:   now,
  }));

  const sign = crypto.createSign('RSA-SHA256');
  sign.update(`${header}.${payload}`);
  const sig = sign.sign(privateKey, 'base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  const jwt = `${header}.${payload}.${sig}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('No access token: ' + JSON.stringify(data));
  return data.access_token;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { token, title, body, link } = req.body || {};
  if (!token || !title) return res.status(400).json({ error: 'Missing token or title' });

  try {
    const accessToken = await getAccessToken();
    const projectId   = process.env.FIREBASE_PROJECT_ID || 'appsados';

    const fcmRes = await fetch(
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      {
        method:  'POST',
        headers: {
          Authorization:  `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            token,
            notification: { title, body: body || '' },
            webpush: {
              notification: {
                title,
                body:  body || '',
                icon:  'https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg',
                vibrate: [200, 100, 200],
              },
              fcm_options: { link: link || 'https://app-sados2.vercel.app' },
            },
          },
        }),
      }
    );

    const result = await fcmRes.json();
    if (!fcmRes.ok) throw new Error(JSON.stringify(result));
    return res.status(200).json({ success: true });
  } catch (e) {
    console.error('FCM error:', e.message);
    return res.status(500).json({ error: e.message });
  }
};
