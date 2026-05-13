const http = require('http');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const appBasePath = `/${path.basename(root)}`;
const port = Number(process.argv[2] || process.env.PORT || 5500);
const host = '127.0.0.1';
const cloudApiBaseUrl = 'https://us-central1-earnlearn-68952.cloudfunctions.net/api';
const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, headers);
  res.end(body);
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function proxyApiRequest(req, res, localPath) {
  try {
    const body = await readRequestBody(req);
    const upstreamUrl = `${cloudApiBaseUrl}${localPath}${(req.url || '').includes('?') ? `?${(req.url || '').split('?').slice(1).join('?')}` : ''}`;
    const headers = { ...req.headers };
    delete headers.host;
    delete headers.connection;
    delete headers['content-length'];
    delete headers['accept-encoding'];
    delete headers.origin;
    delete headers.referer;

    const upstreamResponse = await fetch(upstreamUrl, {
      method: req.method,
      headers,
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : body
    });

    const responseHeaders = {};
    upstreamResponse.headers.forEach((value, key) => {
      if (!['content-encoding', 'transfer-encoding', 'connection'].includes(key.toLowerCase())) {
        responseHeaders[key] = value;
      }
    });

    const responseBody = Buffer.from(await upstreamResponse.arrayBuffer());
    send(res, upstreamResponse.status, responseBody, responseHeaders);
  } catch (error) {
    send(res, 502, JSON.stringify({
      error: 'Local dev proxy could not reach the backend API.',
      detail: error.message
    }), {
      'Content-Type': 'application/json; charset=utf-8'
    });
  }
}

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  const localPath = urlPath === appBasePath
    ? '/'
    : urlPath.startsWith(`${appBasePath}/`)
      ? urlPath.slice(appBasePath.length)
      : urlPath;

  if (localPath === '/health' || localPath.startsWith('/api/')) {
    proxyApiRequest(req, res, localPath);
    return;
  }

  const relativePath = localPath === '/' ? 'index.html' : localPath.replace(/^\/+/, '');
  const requestedPath = relativePath === 'index.html' || path.extname(relativePath)
    ? relativePath
    : 'index.html';
  const filePath = path.resolve(root, requestedPath);

  if (!filePath.startsWith(root)) {
    send(res, 403, 'Forbidden');
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      send(res, 404, 'Not found');
      return;
    }

    send(res, 200, data, {
      'Content-Type': mimeTypes[path.extname(filePath)] || 'application/octet-stream'
    });
  });
});

server.listen(port, host, () => {
  console.log(`JEE Maths Master running at http://${host}:${port}/`);
});
