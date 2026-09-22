import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";

const root = process.cwd();
const port = Number(process.env.PORT ?? 4173);

const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".map", "application/json; charset=utf-8"]
]);

createServer(async (request, response) => {
  try {
    const url = new URL(
      request.url ?? "/",
      `http://127.0.0.1:${port}`
    );

    const pathname = decodeURIComponent(url.pathname);
    let filePath = resolve(
      root,
      `.${pathname}`
    );

    if (
      filePath !== root &&
      !filePath.startsWith(`${root}${sep}`)
    ) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }

    const info = await stat(filePath);

    if (info.isDirectory()) {
      filePath = resolve(filePath, "index.html");
    }

    const body = await readFile(filePath);
    const contentType =
      contentTypes.get(extname(filePath)) ??
      "application/octet-stream";

    response.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": "no-store"
    });

    response.end(body);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
}).listen(port, "127.0.0.1");
