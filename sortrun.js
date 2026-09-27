// sortrun.js：按处理预算处理事件，用尽预算则压账；收尾时不限预算把账补齐。
import { insertKey, rankOf } from "./sorted.js";

const DEFAULT_CODES = {
  dup: "E_DUP_KEY",
  missing: "E_MISSING",
  bad: "E_BAD_EVENT"
};

function codesOf(spec) {
  return {
    dup: spec.dup_error_code || DEFAULT_CODES.dup,
    missing: spec.missing_error_code || DEFAULT_CODES.missing,
    bad: spec.event_error_code || DEFAULT_CODES.bad
  };
}

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function isPositiveInteger(value) {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function isEvent(event) {
  return event !== null && typeof event === "object" && !Array.isArray(event)
    && (event.kind === "insert" || event.kind === "rank")
    && isPositiveInteger(event.key);
}

function signatureOf(kind, key) {
  return kind + "\u0000" + key;
}

function cloneState(state) {
  return {
    keys: (state && state.keys || []).slice(),
    ranks: (state && state.ranks || []).slice(),
    ledger: (state && state.ledger || []).map(function (row) { return row.slice(); }),
    applied: (state && state.applied || []).slice()
  };
}

function isApplied(applied, event) {
  const sig = signatureOf(event.kind, event.key);
  for (let i = 0; i < applied.length; i += 1) {
    if (applied[i] === sig || applied[i] === event.id) {
      return true;
    }
  }
  return false;
}

function applyEvent(state, event, codes) {
  if (event.kind === "insert") {
    if (state.keys.indexOf(event.key) !== -1) {
      fail(codes.dup, "duplicate key: " + event.key);
    }
    state.keys = insertKey(state.keys, event.key);
  } else {
    const rank = rankOf(state.keys, event.key);
    if (rank === -1) {
      fail(codes.missing, "key not in sorted array: " + event.key);
    }
    state.ranks.push(rank);
  }
}

// step：先校验全部事件（与预算无关），再按预算逐条处理，用尽则压账。
export function step(spec) {
  const codes = codesOf(spec || {});
  const events = (spec && spec.events) || [];
  const carriedBefore = (spec.state && spec.state.ledger || []).length;

  // 结构不合法先报 E_BAD_EVENT，不花预算，状态不动。
  for (let i = 0; i < events.length; i += 1) {
    if (!isEvent(events[i])) {
      fail(codes.bad, "event #" + i + " is not a valid insert/rank event");
    }
  }

  const state = cloneState(spec.state);
  let budget = Number.isFinite(spec.budget) ? Math.max(0, Math.floor(Number(spec.budget))) : 0;
  let served = 0;
  state.ledger = [];

  // 待处理队列：先清上一轮压下的账（带签名标记），再处理本轮事件。
  const pending = [];
  for (let i = 0; i < carriedBefore; i += 1) {
    const row = (spec.state.ledger[i] || []);
    pending.push({ kind: row[0], key: row[1], id: signatureOf(row[0], row[1]) });
  }
  for (let i = 0; i < events.length; i += 1) {
    pending.push(events[i]);
  }

  for (let i = 0; i < pending.length; i += 1) {
    const event = pending[i];
    if (isApplied(state.applied, event)) {
      continue; // 重放：已经处理过的不再处理，也不再压账。
    }
    if (budget > 0) {
      applyEvent(state, event, codes);
      state.applied.push(event.id !== undefined ? event.id : signatureOf(event.kind, event.key));
      budget -= 1;
      served += 1;
    } else {
      state.ledger.push([event.kind, event.key]);
    }
  }

  return {
    state: state,
    served: served,
    ledger_before: state.ledger.length,
    ledger: state.ledger.map(function (row) { return row.slice(); }),
    judged: served + state.ledger.length,
    judged_bound: events.length + carriedBefore
  };
}

// close：不限预算把账处理完，返回补齐条数。
export function close(spec) {
  const codes = codesOf(spec || {});
  const state = cloneState(spec.state);
  let catchup = 0;
  while (state.ledger.length > 0) {
    const row = state.ledger.shift();
    const event = { kind: row[0], key: row[1], id: signatureOf(row[0], row[1]) };
    if (!isApplied(state.applied, event)) {
      applyEvent(state, event, codes);
      state.applied.push(event.id);
      catchup += 1;
    }
  }
  return { state: state, catchup: catchup };
}
