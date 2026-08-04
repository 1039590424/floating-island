// map.js
// 世界地图交互核心
// 功能：可拖拽平移、滚轮缩放、点击岛屿人物跑跳移动、展开内容面板
// 设计灵感：任天堂世界地图 + 动森岛屿选择 + 马力欧关卡

import { $, $$ } from '../utils/dom.js';

/**
 * 岛屿配置：位置、尺寸、多层形状路径
 * 每个岛屿有 4 层 SVG path：
 *   - seabed:  海底层（深色，最大，模拟水下阴影）
 *   - beach:   沙滩层（金色，略小）
 *   - grass:   草地层（绿色，主体）
 *   - highland: 高地层（深绿，顶部突出）
 * 每个岛屿还有独特的装饰物（mountain/tree/building/flag）
 */
const ISLANDS = [
  {
    id: 'about',
    name: '玩家档案',
    label: 'PLAYER',
    icon: '◆',
    stage: '1-1',
    x: 2000,
    y: 1400,
    width: 520,
    height: 480,
    variant: 'hero',
    // 主岛：最大，中央有山峰和旗帜
    seabed:   'M40,180 C20,240 30,320 80,380 C130,440 220,470 300,465 C380,460 460,440 490,380 C510,330 510,260 490,200 C470,140 420,80 350,50 C280,20 200,25 140,60 C90,90 55,130 40,180 Z',
    beach:    'M70,200 C55,250 65,320 110,370 C155,420 230,445 300,440 C370,435 435,415 460,365 C478,320 478,260 460,210 C442,160 400,110 340,85 C280,60 210,65 160,90 C115,115 85,155 70,200 Z',
    grass:    'M100,220 C88,260 98,320 135,360 C175,400 240,420 300,415 C360,410 410,395 430,355 C445,320 445,270 430,230 C415,190 380,150 330,135 C285,120 230,125 190,145 C155,165 115,185 100,220 Z',
    highland: 'M150,260 C140,290 150,330 180,350 C215,375 260,385 295,380 C330,375 360,360 375,335 C385,315 385,285 375,265 C365,245 340,230 310,230 C280,230 250,235 225,250 C200,265 165,250 150,260 Z',
    // 装饰：山峰 + 旗帜
    decor: 'mountain',
  },
  {
    id: 'portal',
    name: '关卡传送门',
    label: 'PORTAL',
    icon: '✦',
    stage: '1-2',
    x: 1100,
    y: 700,
    width: 400,
    height: 360,
    variant: 'portal',
    // 传送门岛：椭圆形，有传送门建筑
    seabed:   'M30,140 C15,180 25,240 60,290 C95,330 160,355 220,350 C280,345 335,325 360,285 C375,250 375,200 360,160 C345,120 310,80 260,60 C210,40 150,45 110,70 C70,95 45,110 30,140 Z',
    beach:    'M55,155 C42,190 52,240 82,280 C112,315 170,335 220,330 C270,325 315,310 335,275 C348,245 348,200 335,170 C322,135 295,105 255,90 C215,75 165,80 130,100 C95,120 70,130 55,155 Z',
    grass:    'M80,170 C70,200 78,240 105,270 C130,300 180,315 220,310 C260,305 295,295 312,265 C322,240 322,205 310,180 C298,150 275,128 240,118 C205,108 165,112 135,128 C105,145 90,155 80,170 Z',
    highland: 'M120,200 C112,225 120,255 140,275 C160,290 195,300 220,295 C245,290 265,280 275,260 C282,240 282,215 272,200 C262,185 240,175 220,175 C200,175 175,180 155,195 C135,210 130,195 120,200 Z',
    decor: 'portal-gate',
  },
  {
    id: 'skills',
    name: '技能矩阵',
    label: 'SKILLS',
    icon: '★',
    stage: '1-3',
    x: 2950,
    y: 650,
    width: 420,
    height: 380,
    variant: 'skills',
    // 技能岛：有不规则海岸线，有树
    seabed:   'M35,160 C20,210 30,280 70,330 C110,375 180,395 250,390 C320,385 380,365 400,315 C415,270 415,210 400,160 C385,110 350,65 300,45 C250,25 180,30 130,55 C80,80 50,115 35,160 Z',
    beach:    'M60,175 C48,215 58,275 92,315 C126,355 190,370 250,365 C310,360 360,345 375,300 C388,260 388,210 375,175 C362,135 335,100 290,85 C245,70 185,75 145,95 C105,115 75,140 60,175 Z',
    grass:    'M85,190 C75,225 84,275 112,305 C140,335 195,348 245,343 C295,338 335,325 348,290 C358,260 358,220 348,190 C338,160 315,135 280,125 C245,115 195,120 165,135 C135,150 100,170 85,190 Z',
    highland: 'M125,225 C118,255 126,295 145,315 C165,335 200,345 230,340 C260,335 285,325 295,305 C303,285 303,255 293,235 C283,215 263,205 240,205 C215,205 185,210 165,220 C145,230 135,220 125,225 Z',
    decor: 'trees',
  },
  {
    id: 'projects',
    name: '项目成果',
    label: 'PROJECTS',
    icon: '■',
    stage: '1-4',
    x: 3050,
    y: 2050,
    width: 460,
    height: 420,
    variant: 'projects',
    // 项目岛：大岛，有城堡建筑
    seabed:   'M40,180 C20,240 30,320 80,390 C130,440 220,470 300,465 C380,460 460,440 490,380 C510,330 510,260 490,200 C470,140 420,80 350,50 C280,20 200,25 140,60 C90,90 55,130 40,180 Z',
    beach:    'M70,200 C55,250 65,320 110,380 C155,430 230,455 300,450 C370,445 435,425 460,375 C478,330 478,260 460,210 C442,160 400,110 340,85 C280,60 210,65 160,90 C115,115 85,155 70,200 Z',
    grass:    'M100,220 C88,260 98,330 135,370 C175,410 240,430 300,425 C360,420 410,405 430,365 C445,330 445,270 430,230 C415,190 380,150 330,135 C285,120 230,125 190,145 C155,165 115,185 100,220 Z',
    highland: 'M150,260 C140,290 150,340 180,360 C215,385 260,395 295,390 C330,385 360,370 375,345 C385,325 385,285 375,265 C365,245 340,230 310,230 C280,230 250,235 225,250 C200,265 165,250 150,260 Z',
    decor: 'castle',
  },
  {
    id: 'cards',
    name: '感悟卡片',
    label: 'CARDS',
    icon: '✧',
    stage: '1-5',
    x: 1000,
    y: 2150,
    width: 400,
    height: 360,
    variant: 'cards',
    // 卡片岛：心形倾向，有发光水晶
    seabed:   'M30,140 C15,180 25,240 60,290 C95,330 160,355 220,350 C280,345 335,325 360,285 C375,250 375,200 360,160 C345,120 310,80 260,60 C210,40 150,45 110,70 C70,95 45,110 30,140 Z',
    beach:    'M55,155 C42,190 52,240 82,280 C112,315 170,335 220,330 C270,325 315,310 335,275 C348,245 348,200 335,170 C322,135 295,105 255,90 C215,75 165,80 130,100 C95,120 70,130 55,155 Z',
    grass:    'M80,170 C70,200 78,240 105,270 C130,300 180,315 220,310 C260,305 295,295 312,265 C322,240 322,205 310,180 C298,150 275,128 240,118 C205,108 165,112 135,128 C105,145 90,155 80,170 Z',
    highland: 'M120,200 C112,225 120,255 140,275 C160,290 195,300 220,295 C245,290 265,280 275,260 C282,240 282,215 272,200 C262,185 240,175 220,175 C200,175 175,180 155,195 C135,210 130,195 120,200 Z',
    decor: 'crystal',
  },
];

/** 岛屿间连接路径（人物行走的路线） */
const PATHS = [
  { from: 'about', to: 'portal', via: [{ x: 1600, y: 1100 }] },
  { from: 'about', to: 'skills', via: [{ x: 2500, y: 1100 }] },
  { from: 'about', to: 'projects', via: [{ x: 2500, y: 1700 }] },
  { from: 'about', to: 'cards', via: [{ x: 1500, y: 1750 }] },
];

/** 地图状态 */
const state = {
  scale: 0.5,
  tx: 0,
  ty: 0,
  minScale: 0.25,
  maxScale: 1.2,
  isDragging: false,
  dragStartX: 0,
  dragStartY: 0,
  dragStartTx: 0,
  dragStartTy: 0,
  hasMoved: false,
  activeIsland: null,
  playerIsland: 'about', // 人物当前所在岛屿
  playerX: 2000,
  playerY: 1400,
};

/** 缓存 DOM */
const els = {};

/** 初始化地图 */
function initMap() {
  els.viewport = $('.map-viewport');
  els.canvas = $('.map-canvas');
  els.player = $('.player');
  els.panel = $('.island-panel');
  els.panelInner = $('.island-panel__inner');
  els.minimap = $('.minimap');
  els.minimapViewport = $('.minimap__viewport');

  if (!els.viewport || !els.canvas) return;

  renderIslands();
  renderPaths();
  renderMinimap();
  bindEvents();
  focusIsland('about', false); // 初始聚焦主岛，无动画
  updatePlayerPosition();
}

/** 渲染所有岛屿 */
function renderIslands() {
  ISLANDS.forEach((island) => {
    const node = document.createElement('div');
    node.className = `island-node island-node--${island.variant}`;
    node.dataset.island = island.id;
    node.style.left = `${island.x - island.width / 2}px`;
    node.style.top = `${island.y - island.height / 2}px`;
    node.style.width = `${island.width}px`;
    node.style.height = `${island.height}px`;

    node.innerHTML = `
      <div class="island-shape">
        <svg class="island-svg" viewBox="0 0 ${island.width} ${island.height}" preserveAspectRatio="none">
          <defs>
            <linearGradient id="grass-grad-${island.id}" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="var(--island-grass-top, #7BC97D)" />
              <stop offset="100%" stop-color="var(--island-grass-bottom, #4A9D5C)" />
            </linearGradient>
            <linearGradient id="beach-grad-${island.id}" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#F5D99A" />
              <stop offset="100%" stop-color="#E8C078" />
            </linearGradient>
            <radialGradient id="highlight-grad-${island.id}" cx="0.4" cy="0.2" r="0.6">
              <stop offset="0%" stop-color="rgba(255,255,255,0.5)" />
              <stop offset="100%" stop-color="rgba(255,255,255,0)" />
            </radialGradient>
            <filter id="island-shadow-${island.id}" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="8" stdDeviation="12" flood-opacity="0.25" />
            </filter>
          </defs>
          <!-- 海底层（深色水下阴影）-->
          <path class="island-svg__seabed" d="${island.seabed}" />
          <!-- 沙滩层 -->
          <path class="island-svg__beach" d="${island.beach}" fill="url(#beach-grad-${island.id})" />
          <!-- 草地层（主体）-->
          <path class="island-svg__grass" d="${island.grass}" fill="url(#grass-grad-${island.id})" filter="url(#island-shadow-${island.id})" />
          <!-- 高地层（深绿山顶）-->
          <path class="island-svg__highland" d="${island.highland}" />
          <!-- 顶部高光（模拟光照）-->
          <path class="island-svg__highlight" d="${island.grass}" fill="url(#highlight-grad-${island.id})" />
          <!-- 装饰物 -->
          ${renderDecor(island)}
        </svg>
        <div class="island__badge">${island.stage}</div>
        <div class="island-content">
          <span class="island__icon" aria-hidden="true">${island.icon}</span>
          <span class="island__name">${island.name}</span>
          <span class="island__label">${island.label}</span>
        </div>
      </div>
    `;

    // 点击岛屿：人物移动 + 展开内容
    node.addEventListener('click', (e) => {
      e.stopPropagation();
      if (state.hasMoved) return;
      handleIslandClick(island);
    });

    els.canvas.appendChild(node);
  });
}

/** 渲染岛屿装饰物（山/树/建筑/水晶）*/
function renderDecor(island) {
  const cx = island.width / 2;
  const cy = island.height / 2 - 20;

  switch (island.decor) {
    case 'mountain':
      // 主岛：山峰 + 旗帜
      return `
        <g class="island-decor island-decor--mountain" transform="translate(${cx - 60}, ${cy - 40})">
          <!-- 山体阴影 -->
          <path d="M0,80 L40,10 L80,80 Z" fill="#6B4226" opacity="0.4" transform="translate(8, 6)"/>
          <!-- 山体主体 -->
          <path d="M0,80 L40,10 L80,80 Z" fill="#8B6F47"/>
          <!-- 雪顶 -->
          <path d="M28,28 L40,10 L52,28 L46,24 L40,30 L34,24 Z" fill="#FFFFFF"/>
          <!-- 旗杆 -->
          <line x1="40" y1="10" x2="40" y2="-20" stroke="#4A3520" stroke-width="2"/>
          <!-- 旗帜 -->
          <path d="M40,-18 L60,-14 L40,-8 Z" fill="var(--nintendo-red)"/>
        </g>
      `;
    case 'portal-gate':
      // 传送门岛：拱门
      return `
        <g class="island-decor island-decor--portal" transform="translate(${cx - 40}, ${cy - 50})">
          <!-- 拱门左柱 -->
          <rect x="0" y="20" width="12" height="60" fill="#7B5E3B" rx="2"/>
          <!-- 拱门右柱 -->
          <rect x="68" y="20" width="12" height="60" fill="#7B5E3B" rx="2"/>
          <!-- 拱顶 -->
          <path d="M0,30 Q40,-10 80,30 L80,20 Q40,-20 0,20 Z" fill="#9B7E5A"/>
          <!-- 传送门光芒 -->
          <ellipse cx="40" cy="50" rx="28" ry="30" fill="url(#portal-glow-${island.id})" opacity="0.6"/>
          <defs>
            <radialGradient id="portal-glow-${island.id}">
              <stop offset="0%" stop-color="var(--nintendo-blue-light)" stop-opacity="0.8"/>
              <stop offset="100%" stop-color="var(--nintendo-blue)" stop-opacity="0"/>
            </radialGradient>
          </defs>
        </g>
      `;
    case 'trees':
      // 技能岛：两棵树
      return `
        <g class="island-decor island-decor--trees">
          <g transform="translate(${cx - 50}, ${cy - 30})">
            <!-- 树干 -->
            <rect x="8" y="40" width="6" height="20" fill="#6B4226"/>
            <!-- 树冠层1 -->
            <circle cx="11" cy="35" r="16" fill="#3A7D44"/>
            <!-- 树冠层2（高光）-->
            <circle cx="8" cy="30" r="10" fill="#5BA865"/>
          </g>
          <g transform="translate(${cx + 20}, ${cy - 10})">
            <rect x="8" y="40" width="6" height="20" fill="#6B4226"/>
            <circle cx="11" cy="35" r="14" fill="#3A7D44"/>
            <circle cx="8" cy="30" r="8" fill="#5BA865"/>
          </g>
        </g>
      `;
    case 'castle':
      // 项目岛：城堡
      return `
        <g class="island-decor island-decor--castle" transform="translate(${cx - 50}, ${cy - 50})">
          <!-- 城堡主体 -->
          <rect x="10" y="30" width="80" height="50" fill="#B8B0A3" rx="2"/>
          <!-- 左塔 -->
          <rect x="0" y="15" width="20" height="65" fill="#A09689" rx="2"/>
          <!-- 右塔 -->
          <rect x="80" y="15" width="20" height="65" fill="#A09689" rx="2"/>
          <!-- 中塔 -->
          <rect x="40" y="0" width="20" height="80" fill="#A09689" rx="2"/>
          <!-- 屋顶（红色尖顶）-->
          <path d="M0,15 L10,5 L20,15 Z" fill="var(--nintendo-red)"/>
          <path d="M80,15 L90,5 L100,15 Z" fill="var(--nintendo-red)"/>
          <path d="M40,0 L50,-15 L60,0 Z" fill="var(--nintendo-red)"/>
          <!-- 旗帜 -->
          <line x1="50" y1="-15" x2="50" y2="-25" stroke="#4A3520" stroke-width="1.5"/>
          <path d="M50,-23 L62,-20 L50,-17 Z" fill="var(--nintendo-yellow)"/>
          <!-- 门 -->
          <path d="M42,80 L42,55 Q50,48 58,55 L58,80 Z" fill="#5A4A35"/>
          <!-- 窗户 -->
          <rect x="6" y="35" width="4" height="6" fill="#2A2620"/>
          <rect x="14" y="35" width="4" height="6" fill="#2A2620"/>
          <rect x="86" y="35" width="4" height="6" fill="#2A2620"/>
          <rect x="94" y="35" width="4" height="6" fill="#2A2620"/>
        </g>
      `;
    case 'crystal':
      // 卡片岛：发光水晶
      return `
        <g class="island-decor island-decor--crystal" transform="translate(${cx}, ${cy - 10})">
          <!-- 水晶光晕 -->
          <circle cx="0" cy="0" r="35" fill="var(--nintendo-purple)" opacity="0.2"/>
          <circle cx="0" cy="0" r="25" fill="var(--nintendo-purple)" opacity="0.3"/>
          <!-- 主水晶 -->
          <path d="M0,-30 L12,-5 L8,25 L-8,25 L-12,-5 Z" fill="var(--nintendo-purple)"/>
          <!-- 水晶高光 -->
          <path d="M0,-30 L12,-5 L4,0 L-4,-15 Z" fill="rgba(255,255,255,0.5)"/>
          <!-- 小水晶 -->
          <path d="M-18,10 L-12,0 L-8,20 L-14,18 Z" fill="var(--nintendo-pink)" opacity="0.8"/>
          <path d="M18,10 L12,0 L8,20 L14,18 Z" fill="var(--nintendo-pink)" opacity="0.8"/>
        </g>
      `;
    default:
      return '';
  }
}

/** 渲染岛屿间连接路径 */
function renderPaths() {
  const svg = $('.map__paths');
  if (!svg) return;
  svg.setAttribute('viewBox', '0 0 4000 2800');
  svg.setAttribute('preserveAspectRatio', 'none');

  PATHS.forEach((path) => {
    const fromIsland = ISLANDS.find((i) => i.id === path.from);
    const toIsland = ISLANDS.find((i) => i.id === path.to);
    if (!fromIsland || !toIsland) return;

    // 构建贝塞尔曲线路径
    const from = { x: fromIsland.x, y: fromIsland.y };
    const to = { x: toIsland.x, y: toIsland.y };
    const via = path.via[0] || { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };

    const d = `M ${from.x} ${from.y} Q ${via.x} ${via.y} ${to.x} ${to.y}`;
    const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    pathEl.setAttribute('class', 'map__path');
    pathEl.setAttribute('d', d);
    svg.appendChild(pathEl);
  });
}

/** 渲染小地图 */
function renderMinimap() {
  if (!els.minimap) return;
  const canvas = $('.minimap__canvas');
  if (!canvas) return;

  // 岛屿点
  ISLANDS.forEach((island) => {
    const dot = document.createElement('div');
    dot.className = 'minimap__island';
    dot.dataset.island = island.id;
    dot.style.left = `${(island.x / 4000) * 100}%`;
    dot.style.top = `${(island.y / 2800) * 100}%`;
    canvas.appendChild(dot);
  });

  // 点击小地图跳转
  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width * 4000;
    const y = (e.clientY - rect.top) / rect.height * 2800;
    centerOnPoint(x, y);
  });
}

/** 处理岛屿点击：人物移动 → 展开内容 */
async function handleIslandClick(island) {
  // 更新激活态
  $$('.island-node').forEach((n) => n.classList.remove('is-active'));
  const node = $(`.island-node[data-island="${island.id}"]`);
  node?.classList.add('is-active');
  updateMinimapActive(island.id);

  // 如果人物不在该岛屿，先移动过去
  if (state.playerIsland !== island.id) {
    await movePlayerTo(island);
  } else {
    // 已经在岛屿上，播放跳跃动画
    playJumpAnimation();
  }

  // 展开内容面板
  openPanel(island);
}

/** 人物移动到目标岛屿（沿路径） */
function movePlayerTo(targetIsland) {
  return new Promise((resolve) => {
    const path = PATHS.find(
      (p) =>
        (p.from === state.playerIsland && p.to === targetIsland.id) ||
        (p.to === state.playerIsland && p.from === targetIsland.id)
    );

    const fromIsland = ISLANDS.find((i) => i.id === state.playerIsland);
    const startX = fromIsland.x;
    const startY = fromIsland.y;
    const endX = targetIsland.x;
    const endY = targetIsland.y;

    // 朝向
    if (endX < startX) {
      els.player.classList.add('is-facing-left');
    } else {
      els.player.classList.remove('is-facing-left');
    }

    els.player.classList.add('is-moving');

    // 简单直线移动 + 中点跳跃（模拟跑跳）
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2 - 60; // 中点抬高，模拟跳跃弧线

    // 第一段：跑到中点
    state.playerX = midX;
    state.playerY = midY;
    updatePlayerPosition(600);

    // 第二段：从高点落到目标
    setTimeout(() => {
      state.playerX = endX;
      state.playerY = endY;
      updatePlayerPosition(600);

      // 到达后
      setTimeout(() => {
        els.player.classList.remove('is-moving');
        state.playerIsland = targetIsland.id;
        playJumpAnimation();
        resolve();
      }, 650);
    }, 600);
  });
}

/** 播放跳跃动画 */
function playJumpAnimation() {
  els.player.classList.add('is-jumping');
  setTimeout(() => els.player.classList.remove('is-jumping'), 600);
}

/** 更新人物位置 */
function updatePlayerPosition(duration = 0) {
  if (!els.player) return;
  if (duration > 0) {
    els.player.style.transition = `transform ${duration}ms var(--ease-smooth)`;
  } else {
    els.player.style.transition = 'transform 1.2s var(--ease-smooth)';
  }
  els.player.style.transform = `translate(${state.playerX}px, ${state.playerY}px)`;
}

/** 打开内容面板 */
function openPanel(island) {
  if (!els.panel || !els.panelInner) return;

  // 关闭已有面板
  els.panel.classList.remove('is-open');

  setTimeout(() => {
    // 显示对应内容区，隐藏其他
    $$('.island-panel__body').forEach((b) => {
      b.style.display = b.dataset.panel === island.id ? 'block' : 'none';
    });

    els.panel.classList.add('is-open');
    state.activeIsland = island.id;
    els.viewport.classList.add('is-focused');
  }, 150);
}

/** 关闭面板 */
function closePanel() {
  if (!els.panel) return;
  els.panel.classList.remove('is-open');
  state.activeIsland = null;
  els.viewport.classList.remove('is-focused');
  $$('.island-node').forEach((n) => n.classList.remove('is-active'));
  updateMinimapActive(null);
}

/** 聚焦岛屿（居中显示） */
function focusIsland(islandId, animate = true) {
  const island = ISLANDS.find((i) => i.id === islandId);
  if (!island) return;
  centerOnPoint(island.x, island.y, 0.7, animate);
}

/** 居中到指定坐标 */
function centerOnPoint(x, y, scale = state.scale, animate = true) {
  const viewport = els.viewport;
  const vw = viewport.clientWidth;
  const vh = viewport.clientHeight;

  state.scale = Math.max(state.minScale, Math.min(state.maxScale, scale));
  state.tx = vw / 2 - x * state.scale;
  state.ty = vh / 2 - y * state.scale;

  if (!animate) {
    els.canvas.style.transition = 'none';
  }
  applyTransform();
  if (!animate) {
    requestAnimationFrame(() => {
      els.canvas.style.transition = '';
    });
  }
  updateMinimapViewport();
}

/** 应用变换 */
function applyTransform() {
  els.canvas.style.transform = `translate(${state.tx}px, ${state.ty}px) scale(${state.scale})`;
}

/** 缩放（以指定点为中心） */
function zoomAt(clientX, clientY, delta) {
  const viewport = els.viewport;
  const rect = viewport.getBoundingClientRect();
  const px = clientX - rect.left;
  const py = clientY - rect.top;

  // 鼠标在画布坐标系中的位置
  const canvasX = (px - state.tx) / state.scale;
  const canvasY = (py - state.ty) / state.scale;

  // 新缩放
  const newScale = Math.max(state.minScale, Math.min(state.maxScale, state.scale * (1 + delta)));
  const actualDelta = newScale / state.scale;

  // 调整偏移，使鼠标位置保持不变
  state.tx = px - canvasX * newScale;
  state.ty = py - canvasY * newScale;
  state.scale = newScale;

  els.viewport.classList.add('is-zooming');
  applyTransform();
  updateMinimapViewport();
  setTimeout(() => els.viewport.classList.remove('is-zooming'), 100);
}

/** 更新小地图视口框 */
function updateMinimapViewport() {
  if (!els.minimapViewport) return;
  const vw = els.viewport.clientWidth;
  const vh = els.viewport.clientHeight;

  // 可视区域在画布坐标系中的范围
  const left = -state.tx / state.scale;
  const top = -state.ty / state.scale;
  const width = vw / state.scale;
  const height = vh / state.scale;

  els.minimapViewport.style.left = `${(left / 4000) * 100}%`;
  els.minimapViewport.style.top = `${(top / 2800) * 100}%`;
  els.minimapViewport.style.width = `${(width / 4000) * 100}%`;
  els.minimapViewport.style.height = `${(height / 2800) * 100}%`;
}

/** 更新小地图激活态 */
function updateMinimapActive(islandId) {
  $$('.minimap__island').forEach((dot) => {
    dot.classList.toggle('is-active', dot.dataset.island === islandId);
  });
}

/** 绑定事件 */
function bindEvents() {
  const viewport = els.viewport;
  const canvas = els.canvas;

  // 拖拽平移：监听 canvas 上的 pointerdown（更可靠）
  canvas.addEventListener('pointerdown', (e) => {
    // 忽略岛屿点击（让岛屿自己处理）
    if (e.target.closest('.island-node')) return;
    state.isDragging = true;
    state.hasMoved = false;
    state.dragStartX = e.clientX;
    state.dragStartY = e.clientY;
    state.dragStartTx = state.tx;
    state.dragStartTy = state.ty;
    viewport.classList.add('is-dragging');
    try { viewport.setPointerCapture(e.pointerId); } catch (err) {}
    e.preventDefault();
  });

  // pointermove 监听在 viewport（拖出 canvas 也能响应）
  viewport.addEventListener('pointermove', (e) => {
    if (!state.isDragging) return;
    const dx = e.clientX - state.dragStartX;
    const dy = e.clientY - state.dragStartY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) state.hasMoved = true;
    state.tx = state.dragStartTx + dx;
    state.ty = state.dragStartTy + dy;
    applyTransform();
    updateMinimapViewport();
  });

  // pointerup 监听在 viewport 和 window（确保拖拽结束）
  const endDrag = (e) => {
    if (state.isDragging) {
      state.isDragging = false;
      viewport.classList.remove('is-dragging');
      try { viewport.releasePointerCapture(e.pointerId); } catch (err) {}
      // 延迟重置 hasMoved，让 click 事件能读取到
      setTimeout(() => { state.hasMoved = false; }, 50);
    }
  };
  viewport.addEventListener('pointerup', endDrag);
  viewport.addEventListener('pointercancel', endDrag);

  // 滚轮缩放：监听 viewport
  viewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.12 : 0.12;
    zoomAt(e.clientX, e.clientY, delta);
  }, { passive: false });

  // 点击空白处关闭面板
  viewport.addEventListener('click', (e) => {
    if (state.hasMoved) return;
    if (e.target.closest('.island-node') || e.target.closest('.island-panel') || e.target.closest('.map-controls') || e.target.closest('.minimap')) return;
    if (state.activeIsland) closePanel();
  });

  // 控制按钮
  $('.map-control--zoom-in')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const vw = viewport.clientWidth;
    const vh = viewport.clientHeight;
    zoomAt(vw / 2 + vw / 2, vh / 2, 0.2);
  });
  $('.map-control--zoom-out')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const vw = viewport.clientWidth;
    const vh = viewport.clientHeight;
    zoomAt(vw / 2 + vw / 2, vh / 2, -0.2);
  });
  $('.map-control--reset')?.addEventListener('click', (e) => {
    e.stopPropagation();
    focusIsland('about');
    closePanel();
  });

  // 面板关闭
  $('.island-panel__close')?.addEventListener('click', (e) => {
    e.stopPropagation();
    closePanel();
  });

  // ESC 关闭面板
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.activeIsland) closePanel();
  });

  // 触摸双指缩放
  let touchStartDist = 0;
  let touchStartScale = 1;
  viewport.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchStartDist = Math.sqrt(dx * dx + dy * dy);
      touchStartScale = state.scale;
    }
  });
  viewport.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const newScale = touchStartScale * (dist / touchStartDist);
      const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      const delta = newScale / state.scale - 1;
      zoomAt(centerX, centerY, delta);
    }
  }, { passive: false });

  // 窗口大小变化时更新小地图
  window.addEventListener('resize', () => {
    updateMinimapViewport();
  });
}

/** 暴露给外部的初始化接口 */
export function init() {
  initMap();
}

/** 自动初始化（DOM 加载后） */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
