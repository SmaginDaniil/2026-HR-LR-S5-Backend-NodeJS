import assert from "node:assert/strict";
import { test } from "node:test";
import { parseUserJson } from "../src/server";

test("valid user fields are returned and extra fields are ignored", () => {
  assert.deepEqual(
    parseUserJson('{"name":"Anna","age":25,"admin":true}'),
    { ok: true, user: { name: "Anna", age: 25 } }
  );
});

test("malformed JSON is rejected", () => {
  assert.deepEqual(parseUserJson('{"name":'), {
    ok: false,
    error: "Request body must be valid JSON"
  });
});

test("only JSON objects are accepted at the root", () => {
  for (const body of ["null", "[]", '"Anna"', "25"]) {
    assert.deepEqual(parseUserJson(body), {
      ok: false,
      error: "Request body must be a JSON object"
    });
  }
});

test("name and age must have the expected values", () => {
  for (const body of [
    '{"name":"  ","age":25}',
    '{"name":"Anna","age":-1}',
    '{"name":"Anna","age":25.5}',
    '{"name":"Anna","age":"25"}'
  ]) {
    assert.equal(parseUserJson(body).ok, false);
  }
});
