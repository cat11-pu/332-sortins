// sorted.js：升序有序数组；名次从 1 数，不在数组里给 -1。
export class SortedError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "SortedError";
    this.code = code;
  }
}

export function insertKey(keys, key) {
  if (keys.includes(key)) {
    throw new SortedError("E_DUP_KEY", "key already in sorted array: " + key);
  }
  const next = keys.slice();
  let index = next.length;
  for (let i = 0; i < next.length; i += 1) {
    if (next[i] > key) {
      index = i;
      break;
    }
  }
  next.splice(index, 0, key);
  return next;
}

export function rankOf(keys, key) {
  const index = keys.indexOf(key);
  return index === -1 ? -1 : index + 1;
}
