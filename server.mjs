import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, 'dist');

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function getAssetPath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const safePath = decoded.replace(/^\/+/, '');
  return path.join(distDir, safePath);
}

async function sendFile(res, filePath) {
  try {
    const ext = path.extname(filePath).toLowerCase();
    const content = await readFile(filePath);
    res.statusCode = 200;
    res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
    if (filePath.includes('/assets/')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else {
      res.setHeader('Cache-Control', 'no-cache');
    }
    res.end(content);
  } catch {
    res.statusCode = 404;
    res.end('Not found');
  }
}

const server = createServer(async (req, res) => {
  const method = req.method || 'GET';
  if (!['GET', 'HEAD'].includes(method)) {
    res.statusCode = 405;
    res.end('Method not allowed');
    return;
  }

  const urlPath = req.url || '/';
  const filePath = getAssetPath(urlPath);

  const isAssetRequest = path.extname(filePath) !== '' || urlPath.startsWith('/assets/');

  if (isAssetRequest && existsSync(filePath)) {
    await sendFile(res, filePath);
    return;
  }

  const indexPath = path.join(distDir, 'index.html');
  await sendFile(res, indexPath);
});

const port = Number(process.env.PORT || 3000);
server.listen(port, '0.0.0.0', () => {
  console.log(`Mobile app server running on 0.0.0.0:${port}`);
});
