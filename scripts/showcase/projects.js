// projects.js
// 项目成果集模块 — 展示层
// 「关卡选择」风格：分类筛选 + 项目卡片（含星级、成就、技术栈）
// 数据来源：data/projects.json

import { el, clear } from '../utils/dom.js';

const DATA_URL = 'data/projects.json';

async function loadProjects() {
  try {
    const res = await fetch(DATA_URL, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('[projects] 加载 projects.json 失败', err);
    return null;
  }
}

/** 星级渲染 */
function renderStars(count) {
  if (!count) return null;
  return el('div', { class: 'project-card__stars', attrs: { 'aria-label': `${count} 星` } },
    Array.from({ length: 5 }, (_, i) =>
      el('span', { class: `project-star ${i < count ? 'is-on' : ''}`, attrs: { 'aria-hidden': 'true' } }, '★')
    )
  );
}

/** 单个项目卡片 */
function renderProjectCard(project) {
  const links = project.links || {};
  return el('article', {
    class: 'project-card',
    style: { '--project-color': project.color || 'var(--color-primary)' },
    dataset: { category: project.category, id: project.id },
  }, [
    // 顶部色带 + 关卡编号
    el('div', { class: 'project-card__banner' }, [
      el('div', { class: 'project-card__banner-bg', attrs: { 'aria-hidden': 'true' } }),
      el('div', { class: 'project-card__banner-content' }, [
        el('span', { class: 'project-card__category' }, project.categoryName || project.category),
        el('span', { class: 'project-card__period' }, project.period || ''),
      ]),
      // 关卡编号标记
      el('span', { class: 'project-card__level-mark', attrs: { 'aria-hidden': 'true' } }, '▶'),
    ]),

    el('div', { class: 'project-card__body' }, [
      el('h4', { class: 'project-card__title' }, project.title),
      el('div', { class: 'project-card__role' }, project.role || ''),

      project.stars ? renderStars(project.stars) : null,

      el('p', { class: 'project-card__desc' }, project.desc || ''),

      // 成就亮点
      project.highlights && project.highlights.length
        ? el('ul', { class: 'project-card__highlights' },
            project.highlights.map((h) =>
              el('li', { class: 'project-card__highlight' }, [
                el('span', { class: 'project-card__highlight-icon', attrs: { 'aria-hidden': 'true' } }, '◆'),
                el('span', {}, h),
              ])
            )
          )
        : null,

      // 技术栈
      project.tech && project.tech.length
        ? el('div', { class: 'project-card__tech' },
            project.tech.map((t) => el('span', { class: 'project-tech-tag' }, t))
          )
        : null,

      // 链接
      (links.demo || links.repo)
        ? el('div', { class: 'project-card__links' }, [
            links.demo
              ? el('a', {
                  class: 'project-card__link project-card__link--demo',
                  href: links.demo,
                  attrs: { target: '_blank', rel: 'noopener noreferrer' },
                }, [el('span', { class: 'project-card__link-icon' }, '▶'), '演示'])
              : null,
            links.repo
              ? el('a', {
                  class: 'project-card__link project-card__link--repo',
                  href: links.repo,
                  attrs: { target: '_blank', rel: 'noopener noreferrer' },
                }, [el('span', { class: 'project-card__link-icon' }, '⌥'), '源码'])
              : null,
          ])
        : null,
    ]),
  ]);
}

/** 筛选器 */
function renderFilters(filters, allProjects, gridEl) {
  return el('div', { class: 'projects-filters', role: 'tablist', 'aria-label': '项目分类筛选' },
    filters.map((f, idx) =>
      el('button', {
        class: `projects-filter ${idx === 0 ? 'is-active' : ''}`,
        type: 'button',
        role: 'tab',
        attrs: {
          'aria-selected': idx === 0 ? 'true' : 'false',
          'data-filter': f.id,
        },
        on: {
          click: () => applyFilter(f.id, gridEl, allProjects),
        },
      }, f.name)
    )
  );
}

/** 应用筛选 */
function applyFilter(filterId, gridEl, allProjects) {
  // 更新筛选器激活态
  gridEl.closest('.projects-module')
    ?.querySelectorAll('.projects-filter')
    .forEach((btn) => {
      const active = btn.dataset.filter === filterId;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
    });

  // 过滤卡片
  const cards = gridEl.querySelectorAll('.project-card');
  cards.forEach((card) => {
    const match = filterId === 'all' || card.dataset.category === filterId;
    card.classList.toggle('is-hidden', !match);
  });
}

/** 空状态 */
function renderEmpty() {
  return el('div', { class: 'projects-empty' }, '该分类下暂无项目');
}

/** 错误状态 */
function renderError() {
  return el('div', { class: 'projects-error' }, [
    el('span', { class: 'projects-error__icon' }, '⚠'),
    el('p', {}, '项目数据加载失败，请检查 data/projects.json。'),
  ]);
}

/** 骨架屏 */
function renderSkeleton(container) {
  clear(container);
  container.append(el('div', { class: 'projects-skeleton' },
    Array.from({ length: 4 }, () =>
      el('div', { class: 'projects-skeleton__card' }, [
        el('div', { class: 'projects-skeleton__banner' }),
        el('div', { class: 'projects-skeleton__body' }, [
          el('div', { class: 'about-skeleton__line about-skeleton__line--lg' }),
          el('div', { class: 'about-skeleton__line' }),
          el('div', { class: 'about-skeleton__line about-skeleton__line--sm' }),
        ]),
      ])
    )
  ));
}

/* ============ 模块导出 ============ */
export const projectsModule = {
  async mount(container, app) {
    renderSkeleton(container);
    const data = await loadProjects();
    clear(container);

    if (!data) {
      container.append(renderError());
      return;
    }

    const projects = data.projects || [];
    const filters = data.filters || [];

    const gridEl = el('div', { class: 'projects-grid' },
      projects.length
        ? projects.map(renderProjectCard)
        : [renderEmpty()]
    );

    container.append(
      el('div', { class: 'projects-module' }, [
        el('header', { class: 'island__title' }, [
          '项目成果',
          el('span', { class: 'island__title-accent' }, ['PROJECTS']),
        ]),
        filters.length ? renderFilters(filters, projects, gridEl) : null,
        gridEl,
      ])
    );
  },
};
