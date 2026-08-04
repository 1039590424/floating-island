// storage.js
// localStorage 封装：统一命名空间、JSON 序列化、可选过期时间
// 所有工具层的本地数据通过本模块读写，不散落各处

const NAMESPACE = 'pw'; // Personal Workstation
const VERSION = 1;

/**
 * 构造带命名空间的 key
 */
const buildKey = (key) => `${NAMESPACE}:${key}`;

/**
 * 读取并解析
 * @param {string} key
 * @param {*} [fallback=null] - 解析失败或不存在时返回的默认值
 * @returns {*}
 */
export function get(key, fallback = null) {
  try {
    const raw = localStorage.getItem(buildKey(key));
    if (raw == null) return fallback;
    const data = JSON.parse(raw);
    // 过期检查
    if (data && typeof data === 'object' && data.__expires && Date.now() > data.__expires) {
      localStorage.removeItem(buildKey(key));
      return fallback;
    }
    return data && data.__wrapped ? data.value : data;
  } catch (err) {
    console.warn(`[storage] 读取失败：${key}`, err);
    return fallback;
  }
}

/**
 * 写入（可设置过期时间）
 * @param {string} key
 * @param {*} value
 * @param {Object} [options]
 * @param {number} [options.ttl] - 存活毫秒数
 */
export function set(key, value, options = {}) {
  try {
    const payload = { __wrapped: true, value };
    if (options.ttl && options.ttl > 0) {
      payload.__expires = Date.now() + options.ttl;
    }
    localStorage.setItem(buildKey(key), JSON.stringify(payload));
    return true;
  } catch (err) {
    // 配额超限等错误
    console.warn(`[storage] 写入失败：${key}`, err);
    return false;
  }
}

/**
 * 删除
 */
export function remove(key) {
  localStorage.removeItem(buildKey(key));
}

/**
 * 清空命名空间内所有数据（不影响其他应用）
 */
export function clearAll() {
  const prefix = `${NAMESPACE}:`;
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(prefix)) keys.push(k);
  }
  keys.forEach((k) => localStorage.removeItem(k));
}

/**
 * 列出命名空间下所有 key（不带前缀）
 */
export function keys() {
  const prefix = `${NAMESPACE}:`;
  const result = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(prefix)) result.push(k.slice(prefix.length));
  }
  return result;
}

/**
 * 当前存储使用量估算（字节）
 */
export function size() {
  let total = 0;
  const prefix = `${NAMESPACE}:`;
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(prefix)) {
      total += (k.length + (localStorage.getItem(k) || '').length) * 2; // UTF-16
    }
  }
  return total;
}

/**
 * 列表数据的简易 CRUD 帮助器
 * 适合任务、笔记这类集合型数据
 * @param {string} key
 * @param {string} [idField='id']
 */
export function collection(key, idField = 'id') {
  const read = () => get(key, []);
  const write = (items) => set(key, items);

  return {
    list: () => read(),
    find: (id) => read().find((item) => item[idField] === id),
    add: (item) => {
      const items = read();
      items.push(item);
      write(items);
      return item;
    },
    update: (id, patch) => {
      const items = read();
      const idx = items.findIndex((item) => item[idField] === id);
      if (idx === -1) return null;
      items[idx] = { ...items[idx], ...patch };
      write(items);
      return items[idx];
    },
    remove: (id) => {
      const items = read();
      const next = items.filter((item) => item[idField] !== id);
      write(next);
      return items.length !== next.length;
    },
    clear: () => write([]),
  };
}

export const STORAGE_VERSION = VERSION;
export const STORAGE_NAMESPACE = NAMESPACE;
