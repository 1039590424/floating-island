// helpers.js
// 通用工具函数：格式化、随机、防抖、节流等

/**
 * 防抖：在 wait 毫秒内只执行最后一次
 * @param {Function} fn
 * @param {number} [wait=200]
 * @returns {Function}
 */
export function debounce(fn, wait = 200) {
  let timer = null;
  const debounced = function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), wait);
  };
  debounced.cancel = () => clearTimeout(timer);
  return debounced;
}

/**
 * 节流：每 wait 毫秒最多执行一次
 * @param {Function} fn
 * @param {number} [wait=200]
 * @returns {Function}
 */
export function throttle(fn, wait = 200) {
  let last = 0;
  let timer = null;
  return function (...args) {
    const now = Date.now();
    const remaining = wait - (now - last);
    if (remaining <= 0) {
      clearTimeout(timer);
      timer = null;
      last = now;
      fn.apply(this, args);
    } else if (!timer) {
      timer = setTimeout(() => {
        last = Date.now();
        timer = null;
        fn.apply(this, args);
      }, remaining);
    }
  };
}

/**
 * 生成范围内的随机整数 [min, max]
 */
export const randomInt = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

/**
 * 从数组中随机取一个元素
 */
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/**
 * 按权重随机抽取
 * @param {Array<{weight?: number}>} items
 * @returns {*} 抽中的元素
 */
export function pickWeighted(items) {
  const total = items.reduce((sum, item) => sum + (item.weight ?? 1), 0);
  let r = Math.random() * total;
  for (const item of items) {
    r -= (item.weight ?? 1);
    if (r <= 0) return item;
  }
  return items[items.length - 1];
}

/**
 * 洗牌（Fisher-Yates）
 */
export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * 生成简单 ID
 */
export const uid = (prefix = 'id') =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

/**
 * 格式化日期
 * @param {Date|number|string} date
 * @param {string} [format='YYYY-MM-DD']
 */
export function formatDate(date, format = 'YYYY-MM-DD') {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';

  const pad = (n) => String(n).padStart(2, '0');
  const map = {
    YYYY: d.getFullYear(),
    MM: pad(d.getMonth() + 1),
    DD: pad(d.getDate()),
    HH: pad(d.getHours()),
    mm: pad(d.getMinutes()),
    ss: pad(d.getSeconds()),
  };
  return format.replace(/YYYY|MM|DD|HH|mm|ss/g, (m) => map[m]);
}

/**
 * 相对时间（"3 分钟前"）
 */
export function relativeTime(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const diff = Date.now() - d.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return '刚刚';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} 分钟前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} 小时前`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day} 天前`;
  const month = Math.floor(day / 30);
  if (month < 12) return `${month} 个月前`;
  return `${Math.floor(month / 12)} 年前`;
}

/**
 * HTML 转义，防 XSS
 */
export function escapeHTML(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * 模板字符串替换 {{key}}
 */
export function template(str, data = {}) {
  return str.replace(/\{\{(\w+)\}\}/g, (match, key) =>
    data[key] != null ? String(data[key]) : ''
  );
}

/**
 * 截断字符串
 */
export const truncate = (str, len = 50) =>
  str.length > len ? `${str.slice(0, len)}…` : str;

/**
 * 类似 Python range()
 */
export const range = (start, end, step = 1) => {
  const result = [];
  if (end == null) { end = start; start = 0; }
  for (let i = start; i < end; i += step) result.push(i);
  return result;
};

/**
 * clamp
 */
export const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

/**
 * 简单 sleep
 */
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 颜色：根据稀有度返回 CSS 变量名
 */
export const rarityVar = (rarity) => `--rarity-${rarity || 'common'}`;
