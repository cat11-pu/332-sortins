// sorted.js：保持升序的键数组与名次查询
export function makeError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

export function isPositiveInt(key) {
  return typeof key === "number" && Number.isInteger(key) && key > 0;
}

// 把键插进数组并保持升序；返回新数组，不改动入参。
// 键不是正整数报 E_BAD_EVENT，键已存在报 E_DUP_KEY。
export function insertKey(keys, key) {
  if (!isPositiveInt(key)) throw makeError("E_BAD_EVENT", "键必须是正整数");
  let lo = 0;
  let hi = keys.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (keys[mid] < key) lo = mid + 1;
    else hi = mid;
  }
  if (lo < keys.length && keys[lo] === key) {
    throw makeError("E_DUP_KEY", "键 " + key + " 已存在");
  }
  const next = keys.slice();
  next.splice(lo, 0, key);
  return next;
}

// 返回键在升序数组里的名次（从一数）；不在返回 -1。
export function rankOf(keys, key) {
  if (!isPositiveInt(key)) return -1;
  const index = keys.indexOf(key);
  return index === -1 ? -1 : index + 1;
}
