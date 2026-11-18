import { createServer as createHttpServer, IncomingMessage, Server, ServerResponse } from "node:http";

function sendJson(res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}): void {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    ...headers
  });
  res.end(JSON.stringify(body));
}

function sendError(res: ServerResponse, status: number, error: string, headers: Record<string, string> = {}): void {
  sendJson(res, status, { error }, headers);
}

function handleSearch(req: IncomingMessage, res: ServerResponse, url: URL): void {
  if (req.method !== "GET") {
    sendError(res, 405, "Method Not Allowed", { Allow: "GET" });
    return;
  }

  const query = url.searchParams.get("q");
  if (query === null) {
    sendError(res, 400, 'Query parameter "q" is required');
    return;
  }

  if (query.trim().length === 0) {
    sendError(res, 400, 'Query parameter "q" must not be empty');
    return;
  }

  sendJson(res, 200, { q: query });
}

export function createServer(): Server {
  return createHttpServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");

    if (url.pathname !== "/search") {
      sendError(res, 404, "Not Found");
      return;
    }

    handleSearch(req, res, url);
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT ?? 3000);
  createServer().listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
  });
}
