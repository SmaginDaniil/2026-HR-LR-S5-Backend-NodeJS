import { createServer as createHttpServer, IncomingMessage, Server, ServerResponse } from "node:http";

export const MAX_BODY_SIZE_BYTES = 1024 * 1024;

export interface User {
  name: string;
  age: number;
}

export type UserBodyResult =
  | { ok: true; user: User }
  | { ok: false; error: string };

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

export function parseUserJson(body: string): UserBodyResult {
  let value: unknown;

  try {
    value = JSON.parse(body);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return { ok: false, error: "Request body must be valid JSON" };
    }

    throw error;
  }

  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { ok: false, error: "Request body must be a JSON object" };
  }

  const record = value as Record<string, unknown>;
  if (typeof record.name !== "string" || record.name.trim().length === 0) {
    return { ok: false, error: '"name" must be a non-empty string' };
  }

  if (typeof record.age !== "number" || !Number.isSafeInteger(record.age) || record.age < 0) {
    return { ok: false, error: '"age" must be a non-negative integer' };
  }

  return {
    ok: true,
    user: {
      name: record.name,
      age: record.age
    }
  };
}

function rejectAndClose(req: IncomingMessage, res: ServerResponse, status: number, error: string): void {
  res.once("finish", () => req.destroy());
  sendError(res, status, error, { Connection: "close" });
}

function handleUsers(req: IncomingMessage, res: ServerResponse): void {
  if (req.method !== "POST") {
    sendError(res, 405, "Method Not Allowed", { Allow: "POST" });
    return;
  }

  const contentLength = req.headers["content-length"];
  if (contentLength !== undefined && Number(contentLength) > MAX_BODY_SIZE_BYTES) {
    rejectAndClose(req, res, 413, "Request body is too large");
    return;
  }

  const contentType = req.headers["content-type"]?.split(";", 1)[0].trim().toLowerCase();
  if (contentType !== "application/json") {
    rejectAndClose(req, res, 415, "Content-Type must be application/json");
    return;
  }

  const chunks: Buffer[] = [];
  let receivedBytes = 0;
  let rejected = false;

  req.on("data", (chunk: Buffer | string) => {
    if (rejected) {
      return;
    }

    const data = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    receivedBytes += data.length;
    if (receivedBytes > MAX_BODY_SIZE_BYTES) {
      rejected = true;
      req.pause();
      rejectAndClose(req, res, 413, "Request body is too large");
      return;
    }

    chunks.push(data);
  });

  req.on("end", () => {
    if (rejected) {
      return;
    }

    const result = parseUserJson(Buffer.concat(chunks).toString("utf8"));
    if (!result.ok) {
      sendError(res, 400, result.error);
      return;
    }

    sendJson(res, 201, result.user);
  });
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

    if (url.pathname === "/search") {
      handleSearch(req, res, url);
      return;
    }

    if (url.pathname === "/users") {
      handleUsers(req, res);
      return;
    }

    sendError(res, 404, "Not Found");
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT ?? 3000);
  createServer().listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
  });
}
