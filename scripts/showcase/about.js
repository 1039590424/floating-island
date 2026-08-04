// about.js
// 关于我模块 — 展示层首屏
// 「玩家档案卡」风格：头像、简介、高光数据、经历时间线、联系方式
// 数据来源：data/profile.json

import { el, clear } from '../utils/dom.js';

const DATA_URL = 'data/profile.json';

/** 加载个人资料，失败时返回 null */
async function loadProfile() {
  try {
    const res = await fetch(DATA_URL, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('[about] 加载 profile.json 失败', err);
    return null;
  }
}

/* ============ 渲染各部分 ============ */

/** 英雄区：头像 + 姓名 + 标题 + 一句话 */
function renderHero(profile) {
  return el('div', { class: 'about-hero' }, [
    // 头像徽章（任天堂角色卡风格）
    el('div', { class: 'about-hero__avatar-wrap' }, [
      el('div', { class: 'about-hero__avatar', attrs: { 'aria-hidden': 'true' } }, '★'),
      el('span', { class: 'about-hero__avatar-ring', attrs: { 'aria-hidden': 'true' } }),
    ]),
    el('div', { class: 'about-hero__info' }, [
      el('h3', { class: 'about-hero__name' }, profile.name || '匿名玩家'),
      el('p', { class: 'about-hero__title' }, profile.title || ''),
      profile.tagline
        ? el('p', { class: 'about-hero__tagline' }, [
            el('span', { class: 'about-hero__tagline-mark' }, '“'),
            profile.tagline,
            el('span', { class: 'about-hero__tagline-mark' }, '”'),
          ])
        : null,
      // 状态徽章
      el('div', { class: 'about-hero__badges' }, [
        profile.location
          ? el('span', { class: 'about-badge about-badge--location' }, [
              el('span', { class: 'about-badge__icon' }, '📍'), profile.location,
            ])
          : null,
        profile.availability
          ? el('span', { class: 'about-badge about-badge--status' }, [
              el('span', { class: 'about-badge__dot', attrs: { 'aria-hidden': 'true' } }),
              profile.availability,
            ])
          : null,
      ]),
    ]),
  ]);
}

/** 高光数据条 */
function renderHighlights(highlights = []) {
  if (!highlights.length) return null;
  return el('div', { class: 'about-highlights' },
    highlights.map((h) =>
      el('div', { class: 'about-highlight' }, [
        el('div', { class: 'about-highlight__icon', attrs: { 'aria-hidden': 'true' } }, h.icon || '✦'),
        el('div', { class: 'about-highlight__body' }, [
          el('div', { class: 'about-highlight__value' }, h.value || '—'),
          el('div', { class: 'about-highlight__label' }, h.label || ''),
        ]),
      ])
    )
  );
}

/** 简介段落 */
function renderBio(bio) {
  if (!bio) return null;
  return el('p', { class: 'about-bio' }, bio);
}

/** 关注领域 chips */
function renderFocus(focus = []) {
  if (!focus.length) return null;
  return el('div', { class: 'about-focus' }, [
    el('span', { class: 'about-focus__label' }, '专注领域'),
    el('div', { class: 'about-focus__chips' },
      focus.map((f) => el('span', { class: 'about-chip' }, f))
    ),
  ]);
}

/** 经历时间线（关卡世界地图风格） */
function renderTimeline(experience = []) {
  if (!experience.length) return null;
  return el('div', { class: 'about-timeline' }, [
    el('div', { class: 'about-timeline__header' }, [
      el('span', { class: 'about-timeline__icon', attrs: { 'aria-hidden': 'true' } }, '🗺'),
      el('h4', { class: 'about-timeline__title' }, '职业旅程'),
    ]),
    el('ol', { class: 'about-timeline__list' },
      experience.map((exp, idx) =>
        el('li', {
          class: 'about-timeline__item',
          style: { '--item-index': String(idx) },
        }, [
          // 节点标记
          el('div', { class: 'about-timeline__node', attrs: { 'aria-hidden': 'true' } }, String(idx + 1)),
          el('div', { class: 'about-timeline__card' }, [
            el('div', { class: 'about-timeline__period' }, exp.period || ''),
            el('div', { class: 'about-timeline__role' }, exp.role || ''),
            exp.org ? el('div', { class: 'about-timeline__org' }, exp.org) : null,
            exp.desc ? el('p', { class: 'about-timeline__desc' }, exp.desc) : null,
            exp.tags && exp.tags.length
              ? el('div', { class: 'about-timeline__tags' },
                  exp.tags.map((t) => el('span', { class: 'about-tag' }, t))
                )
              : null,
          ]),
        ])
      )
    ),
  ]);
}

/** 联系方式 */
function renderContact(contact = {}) {
  if (!contact.email && !contact.github) return null;
  return el('div', { class: 'about-contact' }, [
    el('h4', { class: 'about-contact__title' }, '取得联系'),
    el('div', { class: 'about-contact__actions' }, [
      contact.email
        ? el('button', {
            class: 'about-contact__btn about-contact__btn--primary',
            type: 'button',
            attrs: { 'aria-label': '复制邮箱' },
            on: {
              click: () => {
                navigator.clipboard?.writeText(contact.email).then(
                  () => document.dispatchEvent(new CustomEvent('about:toast', { detail: { message: '邮箱已复制到剪贴板', type: 'success' } })),
                  () => document.dispatchEvent(new CustomEvent('about:toast', { detail: { message: '复制失败，请手动选择', type: 'error' } }))
                );
              },
            },
          }, [el('span', { class: 'about-contact__icon' }, '✉'), '复制邮箱'])
        : null,
      contact.github
        ? el('a', {
            class: 'about-contact__btn about-contact__btn--ghost',
            href: contact.github,
            attrs: { target: '_blank', rel: 'noopener noreferrer' },
          }, [el('span', { class: 'about-contact__icon' }, '⌥'), 'GitHub'])
        : null,
    ]),
    contact.note
      ? el('p', { class: 'about-contact__note' }, contact.note)
      : null,
  ]);
}

/** 空状态 / 加载失败 */
function renderError() {
  return el('div', { class: 'about-error' }, [
    el('span', { class: 'about-error__icon' }, '⚠'),
    el('p', {}, '个人资料加载失败，请检查 data/profile.json 是否存在。'),
  ]);
}

/** 骨架屏 */
function renderSkeleton(container) {
  clear(container);
  container.append(el('div', { class: 'about-skeleton' }, [
    el('div', { class: 'about-skeleton__hero' }, [
      el('div', { class: 'about-skeleton__avatar' }),
      el('div', { class: 'about-skeleton__lines' }, [
        el('div', { class: 'about-skeleton__line about-skeleton__line--lg' }),
        el('div', { class: 'about-skeleton__line about-skeleton__line--md' }),
        el('div', { class: 'about-skeleton__line about-skeleton__line--sm' }),
      ]),
    ]),
  ]));
}

/* ============ 模块导出 ============ */
export const aboutModule = {
  async mount(container, app) {
    renderSkeleton(container);

    // Toast 转发
    document.addEventListener('about:toast', (e) => {
      const { message, type = 'info' } = e.detail;
      app.toast?.(message, type);
    });

    const profile = await loadProfile();
    clear(container);

    if (!profile) {
      container.append(renderError());
      return;
    }

    container.append(
      el('div', { class: 'about-module' }, [
        el('header', { class: 'island__title' }, [
          '玩家档案',
          el('span', { class: 'island__title-accent' }, ['PLAYER PROFILE']),
        ]),
        renderHero(profile),
        renderHighlights(profile.highlights),
        renderBio(profile.bio),
        renderContact(profile.contact),
        // 时间线和专注领域折叠到底部，点击展开（保留信息但减少首屏密度）
        el('details', { class: 'about-details' }, [
          el('summary', { class: 'about-details__summary' }, ['展开职业旅程与专注领域']),
          renderFocus(profile.focus),
          renderTimeline(profile.experience),
        ]),
      ])
    );
  },
};
