// rune.js
// 感悟卡片符文生成器 — Canvas 随机绘制
// 根据等级（SSS/S/A/B/C/D/E）生成对应复杂度和华丽度的符文
// 同一种子（keyword + date + userId hash）生成相同符文

/**
 * 等级配置：颜色、层数、粒子数、旋转速度
 * SSS 彩金流光最绚丽，E 铜色微光最暗淡
 */
const GRADE_CONFIG = {
  SSS: {
    name: 'SSS',
    color: '#FFD700',
    colors: ['#FFD700', '#FF6B35', '#FF1744', '#FFD700'], // 彩金渐变
    layers: 6,           // 符文层数（最复杂）
    particles: 40,       // 环绕粒子
    glowRadius: 30,      // 光晕半径
    rotateSpeed: 0.0008, // 持续旋转速度
    lineWidth: 2.5,
    complexity: 1.0,     // 几何复杂度系数
  },
  S: {
    name: 'S',
    color: '#FFD700',
    colors: ['#FFD700', '#FFA500'],
    layers: 5,
    particles: 25,
    glowRadius: 22,
    rotateSpeed: 0.0006,
    lineWidth: 2.2,
    complexity: 0.85,
  },
  A: {
    name: 'A',
    color: '#A855F7',
    colors: ['#A855F7', '#7C3AED'],
    layers: 4,
    particles: 15,
    glowRadius: 16,
    rotateSpeed: 0.0005,
    lineWidth: 2.0,
    complexity: 0.7,
  },
  B: {
    name: 'B',
    color: '#3B82F6',
    colors: ['#3B82F6', '#1D4ED8'],
    layers: 3,
    particles: 8,
    glowRadius: 12,
    rotateSpeed: 0.0004,
    lineWidth: 1.8,
    complexity: 0.55,
  },
  C: {
    name: 'C',
    color: '#10B981',
    colors: ['#10B981', '#059669'],
    layers: 2,
    particles: 4,
    glowRadius: 8,
    rotateSpeed: 0.0003,
    lineWidth: 1.6,
    complexity: 0.4,
  },
  D: {
    name: 'D',
    color: '#9CA3AF',
    colors: ['#9CA3AF', '#6B7280'],
    layers: 2,
    particles: 0,
    glowRadius: 5,
    rotateSpeed: 0.0002,
    lineWidth: 1.4,
    complexity: 0.25,
  },
  E: {
    name: 'E',
    color: '#B87333',
    colors: ['#B87333', '#8B5A2B'],
    layers: 1,
    particles: 0,
    glowRadius: 3,
    rotateSpeed: 0.0001,
    lineWidth: 1.2,
    complexity: 0.15,
  },
};

/**
 * 简易确定性随机数生成器（种子化）
 * 同一种子产生相同序列，保证符文可复现
 */
function seededRandom(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function () {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** 字符串 hash 转数字种子 */
function hashSeed(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) || 1;
}

/**
 * 符文绘制器
 * 在给定 canvas 上绘制符文，支持持续旋转动画
 */
export class RuneRenderer {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {Object} options - { grade, seed, animate }
   */
  constructor(canvas, { grade = 'E', seed = '', animate = true } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.grade = grade;
    this.config = GRADE_CONFIG[grade] || GRADE_CONFIG.E;
    this.seed = hashSeed(seed + grade);
    this.rng = seededRandom(this.seed);
    this.animate = animate;
    this.rotation = 0;
    this.rafId = null;
    this.particles = [];

    // 预生成粒子（位置、大小、速度）
    if (this.config.particles > 0) {
      for (let i = 0; i < this.config.particles; i++) {
        this.particles.push({
          angle: this.rng() * Math.PI * 2,
          radius: 30 + this.rng() * 20,
          size: 1 + this.rng() * 2.5,
          speed: 0.002 + this.rng() * 0.004,
          opacity: 0.4 + this.rng() * 0.6,
        });
      }
    }

    // 预生成符文几何（6 种基础骨架的随机组合）
    this.runes = this._generateRuneLayers();
  }

  /** 生成符文图层：每层一种几何骨架 */
  _generateRuneLayers() {
    const layers = [];
    const layerCount = this.config.layers;
    for (let i = 0; i < layerCount; i++) {
      const type = Math.floor(this.rng() * 6); // 6 种骨架
      layers.push({
        type,
        radius: 15 + i * 8 + this.rng() * 6,
        sides: 3 + Math.floor(this.rng() * 6),  // 多边形边数
        rotation: this.rng() * Math.PI * 2,
        speed: (this.rng() - 0.5) * 0.001 * (i + 1),
        nodes: 2 + Math.floor(this.rng() * 4 * this.config.complexity),
        colorIdx: i % this.config.colors.length,
      });
    }
    return layers;
  }

  /** 绘制单层符文 */
  _drawLayer(layer, cx, cy, time) {
    const ctx = this.ctx;
    const color = this.config.colors[layer.colorIdx];
    const r = Math.max(2, layer.radius);
    const rot = layer.rotation + layer.speed * time;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = this.config.lineWidth;
    ctx.globalAlpha = 0.7 + 0.3 * (1 - layer.colorIdx / this.config.layers);

    switch (layer.type) {
      case 0: // 多边形 + 顶点节点
        this._drawPolygon(0, 0, r, layer.sides);
        this._drawNodes(0, 0, r, layer.sides, 2);
        break;
      case 1: // 同心圆 + 辐射线
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.6, 0, Math.PI * 2);
        ctx.stroke();
        for (let i = 0; i < layer.nodes; i++) {
          const a = (i / layer.nodes) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6);
          ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
          ctx.stroke();
        }
        break;
      case 2: // 星形
        this._drawStar(0, 0, r, r * 0.5, layer.sides);
        break;
      case 3: // 六芒星 / 双三角
        this._drawPolygon(0, 0, r, 3, 0);
        this._drawPolygon(0, 0, r, 3, Math.PI);
        break;
      case 4: // 螺旋
        ctx.beginPath();
        for (let a = 0; a < Math.PI * 4; a += 0.1) {
          const sr = (a / (Math.PI * 4)) * r;
          const x = Math.cos(a) * sr;
          const y = Math.sin(a) * sr;
          if (a === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        break;
      case 5: // 方阵 + 对角线
        ctx.strokeRect(-r, -r, r * 2, r * 2);
        ctx.beginPath();
        ctx.moveTo(-r, -r); ctx.lineTo(r, r);
        ctx.moveTo(r, -r);  ctx.lineTo(-r, r);
        ctx.stroke();
        break;
    }
    ctx.restore();
  }

  _drawPolygon(cx, cy, r, sides, offset = 0) {
    const ctx = this.ctx;
    ctx.beginPath();
    for (let i = 0; i <= sides; i++) {
      const a = offset + (i / sides) * Math.PI * 2;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  _drawStar(cx, cy, rOuter, rInner, points) {
    const ctx = this.ctx;
    ctx.beginPath();
    for (let i = 0; i <= points * 2; i++) {
      const r = i % 2 === 0 ? rOuter : rInner;
      const a = (i / (points * 2)) * Math.PI * 2;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  }

  _drawNodes(cx, cy, r, sides, size) {
    const ctx = this.ctx;
    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /** 绘制粒子环绕 */
  _drawParticles(cx, cy, time) {
    const ctx = this.ctx;
    this.particles.forEach((p) => {
      const a = p.angle + p.speed * time;
      const x = cx + Math.cos(a) * p.radius;
      const y = cy + Math.sin(a) * p.radius;
      ctx.save();
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = this.config.colors[0];
      ctx.beginPath();
      ctx.arc(x, y, p.size, 0, Math.PI * 2);
      ctx.fill();
      // SSS/S 加拖尾光晕
      if (this.config.particles > 20) {
        ctx.globalAlpha = p.opacity * 0.3;
        ctx.beginPath();
        ctx.arc(x, y, p.size * 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
  }

  /** 主绘制 */
  _draw(time = 0) {
    const ctx = this.ctx;
    const { width, height } = this.canvas;
    const cx = width / 2;
    const cy = height / 2;

    ctx.clearRect(0, 0, width, height);

    // 中心光晕
    const glowR = Math.max(1, this.config.glowRadius);
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR * 2);
    gradient.addColorStop(0, this.config.colors[0]);
    gradient.addColorStop(0.5, this.config.colors[0] + '40');
    gradient.addColorStop(1, 'transparent');
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    // 符文层
    this.runes.forEach((layer) => this._drawLayer(layer, cx, cy, time));

    // 粒子
    if (this.config.particles > 0) {
      this._drawParticles(cx, cy, time);
    }

    // 等级文字（底部）
    ctx.save();
    ctx.fillStyle = this.config.colors[0];
    ctx.globalAlpha = 0.8;
    ctx.font = `bold 14px var(--font-rounded, sans-serif)`;
    ctx.textAlign = 'center';
    ctx.fillText(this.config.name, cx, height - 8);
    ctx.restore();
  }

  /** 启动动画循环 */
  start() {
    if (!this.animate || this.rafId) return;
    const loop = (t) => {
      this._draw(t);
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  /** 停止动画 */
  stop() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  /** 单次绘制（静态模式，不动画） */
  drawOnce() {
    this._draw(0);
  }
}

/**
 * 快捷方法：在 canvas 上绘制符文
 * @param {HTMLCanvasElement} canvas
 * @param {string} grade - 等级 SSS/S/A/B/C/D/E
 * @param {string} seed - 种子字符串（如关键词+日期）
 * @param {boolean} animate - 是否持续动画
 */
export function drawRune(canvas, grade, seed, animate = true) {
  const renderer = new RuneRenderer(canvas, { grade, seed, animate });
  if (animate) renderer.start();
  else renderer.drawOnce();
  return renderer;
}

/** 获取等级配置 */
export function getGradeConfig(grade) {
  return GRADE_CONFIG[grade] || GRADE_CONFIG.E;
}

/** 所有等级列表（从高到低） */
export const GRADES = ['SSS', 'S', 'A', 'B', 'C', 'D', 'E'];
