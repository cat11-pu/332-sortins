// sortrun.js：按共用处理预算消费事件，用尽则连着载压账；收尾不限预算清账。
import { insertKey, rankOf, isPositiveInt, makeError } from "./sorted.js";

function cloneState(state) {
  const source = state || {};
  return {
    keys: Array.isArray(source.keys) ? source.keys.slice() : [],
    ranks: Array.isArray(source.ranks) ? source.ranks.slice() : [],
    ledger: Array.isArray(source.ledger) ? source.ledger.map((row) => [row[0], row[1]]) : [],
    applied: Array.isArray(source.applied) ? source.applied.slice() : []
  };
}

function signature(kind, key) {
  return kind + "\u0000" + key;
}

function validateEvent(event) {
  if (!event || typeof event !== "object" || Array.isArray(event)) {
    throw makeError("E_BAD_EVENT", "事件必须是对象");
  }
  if (event.kind !== "insert" && event.kind !== "rank") {
    throw makeError("E_BAD_EVENT", "事件类型只能是 insert 或 rank");
  }
  if (!isPositiveInt(event.key)) {
    throw makeError("E_BAD_EVENT", "事件的键必须是正整数");
  }
}

// 处理一条请求；非法操作直接抛错（E_DUP_KEY / E_MISSING）。
function serve(state, kind, key) {
  if (kind === "insert") {
    state.keys = insertKey(state.keys, key);
  } else {
    const rank = rankOf(state.keys, key);
    if (rank === -1) throw makeError("E_MISSING", "键 " + key + " 不在数组里");
    state.ranks.push(rank);
  }
  state.applied.push(signature(kind, key));
}

// 按预算处理一轮：先清旧账，再处理新事件；预算用尽后剩余请求整段压在账上。
export function step(spec) {
  const state = cloneState(spec.state);
  const events = Array.isArray(spec.events) ? spec.events : [];
  const budget = Number.isInteger(spec.budget) && spec.budget > 0 ? spec.budget : 0;

  for (const event of events) validateEvent(event);

  const incomingLedger = state.ledger.length;
  const queue = state.ledger
    .map((row) => ({ kind: row[0], key: row[1] }))
    .concat(events.map((event) => ({ kind: event.kind, key: event.key, fresh: true })));

  state.ledger = [];
  let served = 0;
  for (const item of queue) {
    const sig = signature(item.kind, item.key);
    if (state.applied.indexOf(sig) !== -1) continue; // 重放：已处理过，不花预算
    if (served >= budget) {
      state.ledger.push([item.kind, item.key]);
      continue;
    }
    serve(state, item.kind, item.key);
    served += 1;
  }

  return {
    state,
    served,
    ledger_before: state.ledger.length,
    ledger: state.ledger.map((row) => [row[0], row[1]]),
    judged: served + state.ledger.length,
    judged_bound: incomingLedger + events.length
  };
}

// 收尾：不限预算把账上剩余请求全部处理完，返回补齐条数。
export function close(spec) {
  const state = cloneState(spec.state);
  let catchup = 0;
  while (state.ledger.length > 0) {
    const row = state.ledger.shift();
    const kind = row[0];
    const key = row[1];
    const sig = signature(kind, key);
    if (state.applied.indexOf(sig) !== -1) continue;
    serve(state, kind, key);
    catchup += 1;
  }
  return { state, catchup };
}
