#!/usr/bin/env node
/**
 * Статик-сервер для UI-редактора. Без зависимостей.
 *
 *   node ui-editor/serve.mjs            # http://localhost:8080/ui-editor/
 *   node ui-editor/serve.mjs 3000       # другой порт
 *
 * Нужен только для удобства: редактор работает и при открытии index.html напрямую.
 */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url)); // корень репозитория
const PORT = Number(process.argv[2] || process.env.PORT || 8080);
const HOST = process.env.HOST || "0.0.0.0";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".txt": "text/plain; charset=utf-8",
  ".lua": "text/plain; charset=utf-8",
};

const server = createServer(async (req, res) => {
  try {
    let path = decodeURIComponent((req.url || "/").split("?")[0]);
    if (path === "/" || path === "/index.html") {
      res.writeHead(302, { Location: "/ui-editor/" });
      return res.end();
    }
    if (!path.startsWith("/ui-editor")) path = "/ui-editor" + path;

    const filePath = normalize(join(ROOT, path));
    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403).end("Forbidden");
      return;
    }

    let target = filePath;
    const info = await stat(target).catch(() => null);
    if (!info) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("404 — нет файла " + path);
    }
    if (info.isDirectory()) target = join(target, "index.html");

    const body = await readFile(target);
    res.writeHead(200, {
      "Content-Type": MIME[extname(target)] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    res.end(body);
  } catch (err) {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("500: " + err.message);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`UI-редактор: http://localhost:${PORT}/ui-editor/`);
  console.log(`(слушаю ${HOST}:${PORT}; Ctrl+C — остановить)`);
});
