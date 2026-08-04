// portal.js
// 主页传送门区模块
// 玻璃卡片网格 + 磁吸 3D 倾斜效果 + 点击跳转

import { el, clear, $ } from '../utils/dom.js';

const PORTALS = [
  {
    id: 'about',
    title: '关于我',
    desc: '玩家档案 · 职业旅程 · 联系方式',
    icon: '◆',
    variant: 'red',
    stage: '1-1',
    action: 'scroll',
    target: '#about',
  },
  {
    id: 'skills',
    title: '技能矩阵',
    desc: 'RPG 风格技能条 · 滚动解锁',
    icon: '★',
    variant: 'gold',
    stage: '1-2',
    action: 'scroll',
    target: '#skills',
  },
  {
    id: 'projects',
    title: '项目成果',
    desc: '关卡选择 · 分类筛选',
    icon: '■',
    variant: 'blue',
    stage: '1-3',
    action: 'scroll',
    target: '#projects',
  },
  {
    id: 'cards',
    title: '感悟卡片',
    desc: '抽卡机制 · 4 稀有度 · 图鉴',
    icon: '✦',
    variant: 'purple',
    stage: '1-4',
    action: 'scroll',
    target: '#cards',
  },
];

/** 磁吸 3D 倾斜：鼠标在卡片上移动时，卡片轻微跟随旋转 */
function bindTilt(cardEl) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.matchMedia('(hover: none)').matches) return; // 触屏跳过

  const onMove = (event) => {
    const rect = cardEl.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    // 倾斜角度（最大 8 度）
    const rotateX = ((y - centerY) / centerY) * -6;
    const rotateY = ((x - centerX) / centerX) * 6;
    cardEl.style.transform = `translateY(-4px) perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  };

  const onLeave = () => {
    cardEl.style.transform = '';
  };

  cardEl.addEventListener('mousemove', onMove);
  cardEl.addEventListener('mouseleave', onLeave);

  return () => {
    cardEl.removeEventListener('mousemove', onMove);
    cardEl.removeEventListener('mouseleave', onLeave);
  };
}

export const portalModule = {
  mount(container, app) {
    const cleanups = [];

    clear(container);
    const grid = el('div', { class: 'portal__grid' });

    PORTALS.forEach((p, idx) => {
      const card = el(
        'button',
        {
          class: `portal-card portal-card--${p.variant}`,
          type: 'button',
          'data-portal-id': p.id,
          'data-stage': p.stage,
          'aria-label': `跳转到${p.title}`,
          style: `animation-delay: ${idx * 0.08}s;`,
        },
        [
          el('span', { class: 'portal-card__stage', 'aria-hidden': 'true' }, [p.stage]),
          el('span', { class: 'portal-card__icon', 'aria-hidden': 'true' }, [p.icon]),
          el('h3', { class: 'portal-card__title' }, [p.title]),
          el('p', { class: 'portal-card__desc' }, [p.desc]),
          el('span', { class: 'portal-card__arrow', 'aria-hidden': 'true' }, ['→']),
        ]
      );

      card.addEventListener('click', () => {
        if (app.state.view !== 'showcase') app.switchView('showcase');
        // 触发对应岛屿点击（在地图上）
        const islandNode = document.querySelector(`.island-node[data-island="${p.id}"]`);
        if (islandNode) {
          islandNode.click();
        } else {
          // 兜底：直接滚动
          const target = $(p.target);
          if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });

      const cleanup = bindTilt(card);
      if (cleanup) cleanups.push(cleanup);
      grid.append(card);
    });

    container.append(
      el('section', { class: 'portal' }, [
        el('header', { class: 'island__title' }, [
          '关卡选择',
          el('span', { class: 'island__title-accent' }, ['STAGE SELECT']),
        ]),
        grid,
      ])
    );

    // 卸载时清理 tilt 监听
    if (app.on) {
      app.on('portal:cleanup', () => cleanups.forEach((fn) => fn && fn()));
    }
  },
  unmount() {
    // mount 中注册的 cleanup 通过 portal:cleanup 事件触发
  },
};
