import assert from "node:assert";
import { insertKey, rankOf } from "../sorted.js";
import { step, close } from "../sortrun.js";
import { render } from "../app.js";

const base = {
  budget: 1,
  state: { keys: [], ranks: [], ledger: [], applied: [] },
  events: [{ id: 1, kind: "insert", key: 5 }],
  dup_error_code: "E_DUP_KEY", missing_error_code: "E_MISSING",
  event_error_code: "E_BAD_EVENT"
};

let failed = 0;
function check(name, fn) {
  try { fn(); console.log("ok " + name); } catch (e) { failed += 1; console.log("FAIL " + name + " :: " + e.message); }
}

check("insertKey returns keys", () => {
  assert.ok(Array.isArray(insertKey([], 7)));
});

check("rankOf returns a number", () => {
  assert.strictEqual(typeof rankOf([3, 5], 5), "number");
});

check("step returns a state", () => {
  assert.strictEqual(typeof step(base).state, "object");
});

check("close returns a state", () => {
  assert.strictEqual(typeof close(base).state, "object");
});

check("render counts events", () => {
  assert.strictEqual(typeof render(base).count, "number");
});

console.log("5 cases, " + failed + " failed");
process.exit(failed === 0 ? 0 : 1);
