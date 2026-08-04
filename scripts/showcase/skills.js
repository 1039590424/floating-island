// skills.js
// 技能矩阵模块 — 展示层
// RPG 技能树风格：等级总览 + 分类技能条（滚动可见时填充动画）
// 数据来源：data/skills.json

import { el, clear } from '../utils/dom.js';

const DATA_URL = 'data/skills.json';

async function loadSkills() {
  try {
    const res = await fetch(DATA_URL, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('[skills] 加载 skills.json 失败', err);
    return null;
  }
}

/** 等级文字描述 */
function levelLabel(level) {
  if (level >= 90) return '精通';
  if (level >= 75) return '熟练';
  if (level >= 60) return '掌握';
  if (level >= 40) return '入门';
  return '了解';
}

/** 等级总览面板（RPG 角色卡） */
function renderSummary(summary) {
  if (!summary) return null;
  return el('div', { class: 'skills-summary' }, [
    el('div', { class: 'skills-summary__avatar', attrs: { 'aria-hidden': 'true' } }, [
      el('span', { class: 'skills-summary__level-mark' }, 'Lv'),
      el('span', { class: 'skills-summary__level-num' }, String(summary.level ?? '—')),
    ]),
    el('div', { class: 'skills-summary__info' }, [
      el('div', { class: 'skills-summary__title' }, summary.title || '技能图谱'),
      el('p', { class: 'skills-summary__tagline' }, summary.tagline || ''),
      // 经验条装饰
      el('div', { class: 'skills-summary__exp' }, [
        el('div', { class: 'skills-summary__exp-bar' },
          el('div', { class: 'skills-summary__exp-fill' })
        ),
        el('span', { class: 'skills-summary__exp-text' }, 'EXP ████████░░ 82%'),
      ]),
    ]),
  ]);
}

/** 单条技能 */
function renderSkill(skill, colorVar) {
  return el('div', { class: 'skill-item' }, [
    el('div', { class: 'skill-item__head' }, [
      el('span', { class: 'skill-item__name' }, skill.name),
      el('span', { class: 'skill-item__level' }, [
        el('span', { class: 'skill-item__level-num', dataset: { target: String(skill.level) } }, '0'),
        el('span', { class: 'skill-item__level-unit' }, '/100'),
        el('span', { class: 'skill-item__level-tag' }, levelLabel(skill.level)),
      ]),
    ]),
    el('div', { class: 'skill-bar', style: { '--skill-color': colorVar } }, [
      el('div', {
        class: 'skill-bar__fill',
        dataset: { level: String(skill.level) },
        style: { width: '0%' },
      }),
    ]),
    skill.note ? el('p', { class: 'skill-item__note' }, skill.note) : null,
  ]);
}

/** 分类区块 */
function renderCategory(cat) {
  return el('div', { class: 'skill-category', style: { '--cat-color': cat.color || 'var(--color-primary)' } }, [
    el('div', { class: 'skill-category__header' }, [
      el('span', { class: 'skill-category__icon', attrs: { 'aria-hidden': 'true' } }, cat.icon || '◆'),
      el('h4', { class: 'skill-category__name' }, cat.name || cat.id),
    ]),
    el('div', { class: 'skill-category__list' },
      (cat.skills || []).map((s) => renderSkill(s, cat.color))
    ),
  ]);
}

/** 错误状态 */
function renderError() {
  return el('div', { class: 'skills-error' }, [
    el('span', { class: 'skills-error__icon' }, '⚠'),
    el('p', {}, '技能数据加载失败，请检查 data/skills.json。'),
  ]);
}

/** 骨架屏 */
function renderSkeleton(container) {
  clear(container);
  container.append(el('div', { class: 'skills-skeleton' },
    Array.from({ length: 2 }, () =>
      el('div', { class: 'skills-skeleton__cat' }, [
        el('div', { class: 'skills-skeleton__bar about-skeleton__line about-skeleton__line--md' }),
        el('div', { class: 'skills-skeleton__bar about-skeleton__line' }),
        el('div', { class: 'skills-skeleton__bar about-skeleton__line' }),
      ])
    )
  ));
}

/* ============ 进度条动画（IntersectionObserver）============ */
function observeBars(root) {
  const bars = root.querySelectorAll('.skill-bar__fill');
  const nums = root.querySelectorAll('.skill-item__level-num');
  if (!bars.length) return;

  if (!('IntersectionObserver' in window)) {
    // 兜底：直接填充
    bars.forEach((bar) => {
      bar.style.width = `${bar.dataset.level}%`;
    });
    nums.forEach((n) => { n.textContent = n.dataset.target; });
    return;
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const bar = entry.target;
      const level = Number(bar.dataset.level || 0);
      // 错峰动画
      const idx = Array.from(bars).indexOf(bar);
      setTimeout(() => {
        bar.style.width = `${level}%`;
        // 数字滚动
        const numEl = bar.closest('.skill-item')?.querySelector('.skill-item__level-num');
        if (numEl) animateNumber(numEl, level);
      }, idx * 80);
      io.unobserve(bar);
    });
  }, { threshold: 0.3 });

  bars.forEach((bar) => io.observe(bar));
}

/** 数字滚动到目标值 */
function animateNumber(el, target, duration = 800) {
  const start = 0;
  const startTime = performance.now();
  function step(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    // ease-out
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = String(Math.round(start + (target - start) * eased));
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = String(target);
  }
  requestAnimationFrame(step);
}

/* ============ 模块导出 ============ */
export const skillsModule = {
  async mount(container, app) {
    renderSkeleton(container);
    const data = await loadSkills();
    clear(container);

    if (!data) {
      container.append(renderError());
      return;
    }

    const root = el('div', { class: 'skills-module' }, [
      el('header', { class: 'island__title' }, [
        '技能矩阵',
        el('span', { class: 'island__title-accent' }, ['SKILL TREE']),
      ]),
      renderSummary(data.summary),
      el('div', { class: 'skills-grid' },
        (data.categories || []).map(renderCategory)
      ),
    ]);
    container.append(root);

    // 触发进度条动画
    observeBars(root);
  },
};
