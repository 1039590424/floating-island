// dock.js
// 底部悬浮命令岛交互组件
// 致敬任天堂 Joy-Con：磁吸效果 + 键盘快捷键 + 滚动隐藏
// 核心点击/切换逻辑由 app.js 事件委托处理，本组件负责增强交互

import { app } from '../app.js';

let cleanupFns = [];

/** 磁吸效果：鼠标在 dock 区域移动时，附近图标轻微跟随放大 */
function bindMagnetic() {
  const dock = app.els.dock;
  if (!dock) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.matchMedia('(hover: none)').matches) return; // 触屏设备跳过

  const items = Array.from(dock.querySelectorAll('.dock__item'));

  const onMove = (event) => {
    const rect = dock.getBoundingClientRect();
    const mouseX = event.clientX;

    items.forEach((item) => {
      const itemRect = item.getBoundingClientRect();
      const itemCenter = itemRect.left + itemRect.width / 2;
      const distance = Math.abs(mouseX - itemCenter);
      const maxDistance = 120; // 影响半径

      if (distance < maxDistance) {
        // 距离越近，放大越多（高斯衰减）
        const factor = 1 - distance / maxDistance;
        const scale = 1 + factor * 0.25;
        const lift = factor * 6;
        item.style.transform = `translateY(${-lift}px) scale(${scale})`;
      } else {
        item.style.transform = '';
      }
    });
  };

  const onLeave = () => {
    items.forEach((item) => { item.style.transform = ''; });
  };

  dock.addEventListener('mousemove', onMove);
  dock.addEventListener('mouseleave', onLeave);

  return () => {
    dock.removeEventListener('mousemove', onMove);
    dock.removeEventListener('mouseleave', onLeave);
    items.forEach((item) => { item.style.transform = ''; });
  };
}

/** 键盘快捷键：数字键 1-6 快速切换
 *  1 展示页 / 2 工作台 / 3 快捷工具 / 4 知识库 / 5 任务日程 / 6 感悟卡片(滚到) */
function bindShortcuts() {
  const map = {
    '1': () => app.switchView('showcase'),
    '2': () => app.openTool('dashboard'),
    '3': () => app.openTool('quicktools'),
    '4': () => app.openTool('knowledge'),
    '5': () => app.openTool('tasks'),
    '6': () => {
      if (app.state.view !== 'showcase') app.switchView('showcase');
      document.getElementById('cards')?.scrollIntoView({ behavior: 'smooth' });
    },
  };

  const onKey = (event) => {
    // 输入框中不触发
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const handler = map[event.key];
    if (handler) {
      event.preventDefault();
      handler();
    }
  };

  document.addEventListener('keydown', onKey);
  return () => document.removeEventListener('keydown', onKey);
}

/** 移动端滚动隐藏：向下滚动隐藏 dock，向上滚动显示 */
function bindScrollHide() {
  if (window.innerWidth >= 768) return; // 仅移动端

  const dock = app.els.dock;
  if (!dock) return;

  let lastY = window.scrollY;
  let ticking = false;

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      const delta = y - lastY;
      // 滚动超过阈值才切换，避免抖动
      if (delta > 8 && y > 200) {
        dock.style.transform = 'translateX(-50%) translateY(120%)';
        dock.style.opacity = '0';
      } else if (delta < -8 || y < 100) {
        dock.style.transform = 'translateX(-50%) translateY(0)';
        dock.style.opacity = '1';
      }
      lastY = y;
      ticking = false;
    });
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  return () => {
    window.removeEventListener('scroll', onScroll);
    dock.style.transform = '';
    dock.style.opacity = '';
  };
}

/** Dock 组件：作为模块注册到 app */
export const dockComponent = {
  mount() {
    cleanupFns.push(bindMagnetic());
    cleanupFns.push(bindShortcuts());
    cleanupFns.push(bindScrollHide());
  },
  unmount() {
    cleanupFns.forEach((fn) => fn && fn());
    cleanupFns = [];
  },
};
