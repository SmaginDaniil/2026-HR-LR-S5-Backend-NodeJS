import assert from "node:assert/strict";
import { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import { createServer } from "../src/server";

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

test("GET /search returns the supplied query", async () => {
  const response = await fetch(`${baseUrl}/search?q=node`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { q: "node" });
});

test("GET /search rejects a missing or blank query", async () => {
  for (const path of ["/search", "/search?q=", "/search?q=%20%20"]) {
    const response = await fetch(`${baseUrl}${path}`);

    assert.equal(response.status, 400);
    assert.equal(typeof (await response.json() as { error?: unknown }).error, "string");
  }
});

test("unknown paths return 404", async () => {
  const response = await fetch(`${baseUrl}/elsewhere`);

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: "Not Found" });
});

test("non-GET requests to /search return 405 and Allow", async () => {
  const response = await fetch(`${baseUrl}/search?q=node`, { method: "POST" });

  assert.equal(response.status, 405);
  assert.equal(response.headers.get("allow"), "GET");
  assert.deepEqual(await response.json(), { error: "Method Not Allowed" });
});
