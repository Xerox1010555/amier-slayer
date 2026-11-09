/* Optional static preview server for amier-portfolio-v3
   Usage: node server.js → http://localhost:8130

   Hardening:
   - Only GET/HEAD allowed
   - Path-traversal-proof (resolve + relative check, no prefix trips)
   - Null-byte and malformed-URL rejection
   - Same security headers the production CDN sends
*/
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname);
const PORT = process.env.PORT || 8130;
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon"
};

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "geolocation=(), microphone=(), camera=(), interest-cohort=()",
  "X-Frame-Options": "DENY",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com data:; img-src 'self' data: blob:; connect-src 'self' blob:; base-uri 'self'; form-action 'none'; frame-ancestors 'none'"
};

/* dev-only escape hatch: ?__devframe=1 lets the local responsive harness frame the page */
let __noFrame = false;

function headersFor(extra) {
  const h = Object.assign({}, SECURITY_HEADERS, extra || {});
  if (__noFrame) {
    delete h["X-Frame-Options"];
    h["Content-Security-Policy"] = h["Content-Security-Policy"].replace("; frame-ancestors 'none'", "");
  }
  return h;
}

function send(res, status, headers, body) {
  res.writeHead(status, headersFor(headers));
  res.end(body);
}

http
  .createServer((req, res) => {
    __noFrame = /__devframe=1/.test(req.url || "");
    // Method allow-list
    if (req.method !== "GET" && req.method !== "HEAD") {
      send(res, 405, { Allow: "GET, HEAD", "Content-Type": "text/plain" }, "Method not allowed");
      return;
    }

    let urlPath;
    try {
      urlPath = decodeURIComponent(req.url.split("?")[0]);
    } catch {
      send(res, 400, { "Content-Type": "text/plain" }, "Bad request");
      return;
    }

    // reject control chars / null bytes outright
    if (/[\0-\x1f\x7f]/.test(urlPath)) {
      send(res, 400, { "Content-Type": "text/plain" }, "Bad request");
      return;
    }

    if (urlPath === "/") urlPath = "/index.html";

    // resolve fully, then verify the result stays inside ROOT
    const filePath = path.resolve(ROOT, "." + path.posix.normalize(urlPath));
    const rel = path.relative(ROOT, filePath);
    if (rel.startsWith("..") || path.isAbsolute(rel) || rel === "") {
      send(res, 403, { "Content-Type": "text/plain" }, "Forbidden");
      return;
    }

    fs.stat(filePath, (statErr, stat) => {
      if (statErr || !stat.isFile()) {
        send(res, 404, { "Content-Type": "text/plain" }, "Not found");
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const type = TYPES[ext] || "application/octet-stream";
      const isAsset = filePath.includes(`${path.sep}assets${path.sep}`);
      const cache = isAsset
        ? "public, max-age=31536000, immutable"
        : ext === ".png" || ext === ".jpg" || ext === ".webp"
          ? "public, max-age=2592000"
          : "no-cache";

      const headers = headersFor({ "Content-Type": type, "Cache-Control": cache });

      if (req.method === "HEAD") {
        res.writeHead(200, Object.assign({ "Content-Length": stat.size }, headers));
        res.end();
        return;
      }

      res.writeHead(200, Object.assign({ "Content-Length": stat.size }, headers));
      fs.createReadStream(filePath).pipe(res);
    });
  })
  .listen(PORT, "127.0.0.1", () => {
    console.log(`Preview server running at http://localhost:${PORT}`);
  });
