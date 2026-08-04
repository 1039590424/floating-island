// dom.js
// DOM 操作辅助函数

/**
 * 选择单个元素
 * @param {string} selector
 * @param {ParentNode} [parent=document]
 * @returns {HTMLElement|null}
 */
export const $ = (selector, parent = document) => parent.querySelector(selector);

/**
 * 选择多个元素
 * @param {string} selector
 * @param {ParentNode} [parent=document]
 * @returns {HTMLElement[]}
 */
export const $$ = (selector, parent = document) =>
  Array.from(parent.querySelectorAll(selector));

/**
 * 创建元素（支持 props、children、事件）
 * @param {string} tag - 标签名，如 'div'
 * @param {Object} [props] - 属性对象，支持 class/className、dataset、on* 事件、style、html、text
 * @param {(Node|string)[]} [children] - 子节点
 * @returns {HTMLElement}
 */
export function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);

  for (const [key, value] of Object.entries(props)) {
    if (value == null || value === false) continue;

    if (key === 'class' || key === 'className') {
      const classes = Array.isArray(value) ? value.filter(Boolean) : String(value).split(/\s+/).filter(Boolean);
      if (classes.length) node.classList.add(...classes);
    } else if (key === 'dataset' && typeof value === 'object') {
      Object.assign(node.dataset, value);
    } else if (key === 'style' && typeof value === 'object') {
      Object.assign(node.style, value);
    } else if (key === 'html') {
      node.innerHTML = value;
    } else if (key === 'text') {
      node.textContent = value;
    } else if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === 'attrs' && typeof value === 'object') {
      for (const [k, v] of Object.entries(value)) node.setAttribute(k, v);
    } else if (key in node && typeof node[key] !== 'function') {
      // 直接属性赋值（如 id、value、checked）
      node[key] = value;
    } else {
      node.setAttribute(key, value);
    }
  }

  const kids = Array.isArray(children) ? children : [children];
  for (const child of kids) {
    if (child == null || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }

  return node;
}

/**
 * 清空元素所有子节点
 * @param {HTMLElement} node
 */
export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}

/**
 * 安全设置元素 innerHTML（先清空再插入解析后的节点）
 * @param {HTMLElement} node
 * @param {string} html
 */
export function setHTML(node, html) {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  clear(node);
  node.append(template.content.cloneNode(true));
  return node;
}

/**
 * 元素是否存在某个 class
 */
export const hasClass = (node, cls) => node.classList.contains(cls);

/**
 * 添加/移除 class
 */
export const addClass = (node, ...cls) => node.classList.add(...cls.filter(Boolean));
export const removeClass = (node, ...cls) => node.classList.remove(...cls.filter(Boolean));
export const toggleClass = (node, cls, force) => node.classList.toggle(cls, force);

/**
 * 等待 DOMContentLoaded
 */
export const ready = () =>
  document.readyState === 'loading'
    ? new Promise((resolve) => document.addEventListener('DOMContentLoaded', resolve, { once: true }))
    : Promise.resolve();

/**
 * 等待元素出现在 DOM 中
 * @param {string} selector
 * @param {number} [timeout=5000]
 */
export function waitFor(selector, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const found = document.querySelector(selector);
    if (found) return resolve(found);

    const observer = new MutationObserver(() => {
      const node = document.querySelector(selector);
      if (node) {
        observer.disconnect();
        clearTimeout(timer);
        resolve(node);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    const timer = setTimeout(() => {
      observer.disconnect();
      reject(new Error(`waitFor("${selector}") 超时`));
    }, timeout);
  });
}

/**
 * 平滑滚动到元素
 * @param {HTMLElement} target
 * @param {ScrollIntoViewOptions} [options]
 */
export function scrollToEl(target, options = { behavior: 'smooth', block: 'start' }) {
  target.scrollIntoView(options);
}

/**
 * 防止事件默认行为并阻止冒泡
 */
export function swallow(event) {
  if (event && typeof event.preventDefault === 'function') event.preventDefault();
  if (event && typeof event.stopPropagation === 'function') event.stopPropagation();
}
