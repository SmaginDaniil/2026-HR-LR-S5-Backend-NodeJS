import assert from "node:assert/strict";
import { request } from "node:http";
import { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import { MAX_BODY_SIZE_BYTES, createServer } from "../src/server";

const server = createServer();
let baseUrl: string;

before(async () => {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
});

test("POST /users creates a user and omits extra fields", async () => {
  const response = await fetch(`${baseUrl}/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Anna", age: 25, admin: true })
  });

  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), { name: "Anna", age: 25 });
});

test("POST /users reports malformed JSON and invalid root values", async () => {
  for (const body of ['{"name":', "null", "[]"]) {
    const response = await fetch(`${baseUrl}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body
    });

    assert.equal(response.status, 400);
    assert.equal(typeof (await response.json() as { error?: unknown }).error, "string");
  }
});

test("POST /users rejects unsupported content types", async () => {
  const response = await fetch(`${baseUrl}/users`, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: '{"name":"Anna","age":25}'
  });

  assert.equal(response.status, 415);
  assert.deepEqual(await response.json(), { error: "Content-Type must be application/json" });
});

test("POST /users rejects an oversized Content-Length before reading a body", async () => {
  const response = await new Promise<{ status: number; body: string }>((resolve, reject) => {
    const req = request(`${baseUrl}/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": String(MAX_BODY_SIZE_BYTES + 1)
      }
    }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () => resolve({
        status: res.statusCode ?? 0,
        body: Buffer.concat(chunks).toString("utf8")
      }));
    });

    req.on("error", reject);
    req.setTimeout(3000, () => req.destroy(new Error("Timed out waiting for 413 response")));
    req.end();
  });

  assert.equal(response.status, 413);
  assert.deepEqual(JSON.parse(response.body), { error: "Request body is too large" });
});

test("POST /users also limits bodies without Content-Length", async () => {
  const response = await new Promise<{ status: number; body: string }>((resolve, reject) => {
    const req = request(`${baseUrl}/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Transfer-Encoding": "chunked"
      }
    }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () => resolve({
        status: res.statusCode ?? 0,
        body: Buffer.concat(chunks).toString("utf8")
      }));
    });

    req.on("error", reject);
    req.setTimeout(3000, () => req.destroy(new Error("Timed out waiting for 413 response")));
    req.write(" ".repeat(MAX_BODY_SIZE_BYTES + 1));
    req.end();
  });

  assert.equal(response.status, 413);
  assert.deepEqual(JSON.parse(response.body), { error: "Request body is too large" });
});

test("non-POST requests to /users return 405 and Allow", async () => {
  const response = await fetch(`${baseUrl}/users`);

  assert.equal(response.status, 405);
  assert.equal(response.headers.get("allow"), "POST");
  assert.deepEqual(await response.json(), { error: "Method Not Allowed" });
});
