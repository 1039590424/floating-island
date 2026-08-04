// map3d.js
// 3D 浮空岛世界地图（Three.js）
// 功能：5 个动森风格低多边形浮空岛、OrbitControls 视角、点击岛屿人物跳跃移动、内容面板展开
// 设计灵感：动森岛屿选择 + 任天堂世界地图 + 马力欧关卡
// 依赖：通过 importmap 从 CDN 引入 Three.js（在 index.html 中配置）

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ============ 岛屿配置 ============
// 每个岛屿：id（与面板 data-panel 对应）、name、stage、世界坐标 x/z、size（半径）、装饰物类型
// 分布：去掉桥后岛屿更紧凑，展示区右侧弧形、工具区左侧弧形，主岛相距 28
const ISLANDS = [
  // ===== 展示区（右侧，绿色系 0x7BC97D）— 个人档案与展示 =====
  // 主岛 about 居中右侧，子岛呈弧形环绕（间距 14-16，避免重叠）
  { id: 'about',    name: '玩家档案',   stage: '1-1', x: 14,  z: 0,   size: 6.5, decor: 'mountain', color: 0x7BC97D },
  { id: 'portal',   name: '关卡传送门', stage: '1-2', x: 22,  z: -14, size: 4.5, decor: 'portal',   color: 0x7BC97D },
  { id: 'skills',   name: '技能矩阵',   stage: '1-3', x: 32,  z: -3,  size: 5,   decor: 'trees',    color: 0x7BC97D },
  { id: 'projects', name: '项目成果',   stage: '1-4', x: 28,  z: 14,  size: 5.5, decor: 'castle',   color: 0x7BC97D },
  { id: 'cards',    name: '感悟卡片',   stage: '1-5', x: 12,  z: -22, size: 4.5, decor: 'crystal',  color: 0x7BC97D },
  // ===== 工具区（左侧，蓝色系 0x6BA8E8）— 工具与工作 =====
  // 主岛 dashboard 居中左侧，子岛呈弧形环绕，与 about 隔海相望
  { id: 'dashboard',  name: '工作台',   stage: '2-1', x: -14, z: 0,   size: 5.5, decor: 'mountain', color: 0x6BA8E8, type: 'tool' },
  { id: 'quicktools', name: '工具台',   stage: '2-2', x: -22, z: -14, size: 4.5, decor: 'castle',   color: 0x6BA8E8, type: 'tool' },
  { id: 'knowledge',  name: '知识库',   stage: '2-3', x: -32, z: -3,  size: 5,   decor: 'trees',    color: 0x6BA8E8, type: 'tool' },
  { id: 'tasks',      name: '任务日程', stage: '2-4', x: -28, z: 14,  size: 4.5, decor: 'crystal',  color: 0x6BA8E8, type: 'tool' },
];

// ============ 全局状态 ============
const state = {
  scene: null,
  camera: null,
  renderer: null,
  controls: null,
  raycaster: null,
  pointer: null,
  clock: null,
  container: null,
  islands: [],            // 岛屿条目数组：{ group, config, floatOffset, baseY, targetScale, currentScale }
  character: null,        // 人物角色 Group
  activeIslandId: null,   // 当前激活的岛屿 id
  currentIslandId: 'about', // 人物当前所在岛屿 id
  isMoving: false,        // 人物是否正在移动
  characterAnim: null,    // 人物移动动画状态
  cameraAnim: null,       // 相机动画状态
  dirLight: null,
  ambientLight: null,
  hemiLight: null,
  initialized: false,
  // 相机初始参数（reset 用）— 岛屿范围缩小后相机拉近，场景更饱满
  initialCameraPos: new THREE.Vector3(0, 26, 44),
  initialCameraTarget: new THREE.Vector3(0, 0, 0),
};

// 工具岛屿点击回调（由 main.js 设置，点击工具岛时切换到 tools-view）
let toolIslandHandler = null;
export function setToolIslandHandler(fn) { toolIslandHandler = fn; }

// ============ 材质工厂 ============
// 统一用 MeshStandardMaterial + flatShading，保证低多边形质感
function makeMaterial(color, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    flatShading: true,
    roughness: 0.8,
    metalness: 0,
    ...options,
  });
}

// ============ 构建单个岛屿（精细版）============
// 层次结构：岛底不规则岩石锥 → 沙滩层 → 草地台地 → 高地隆起 → 装饰物
// 使用顶点位移制造有机不规则感，多层材质营造立体深度
function buildIsland(config) {
  const group = new THREE.Group();
  group.userData = { id: config.id, name: config.name, stage: config.stage, config };
  group.position.set(config.x, 0, config.z);

  const size = config.size;
  const grassColor = config.color || 0x7BC97D;

  // ---- 1. 岛底岩石：不规则倒锥（顶点位移 + 多段段数）----
  const rockSegments = 10;
  const rockGeom = new THREE.ConeGeometry(size, size * 1.8, rockSegments, 3);
  // 顶点位移：让边缘不规则，模拟自然岩石侵蚀感
  const rockPos = rockGeom.attributes.position;
  for (let i = 0; i < rockPos.count; i++) {
    const x = rockPos.getX(i);
    const y = rockPos.getY(i);
    const z = rockPos.getZ(i);
    // 只位移侧面顶点（非底面非尖端）
    if (y > -size * 0.9 && y < size * 0.9) {
      const noise = (Math.sin(x * 2.3) + Math.cos(z * 1.7)) * 0.15;
      rockPos.setX(i, x + noise * size * 0.12);
      rockPos.setZ(i, z + noise * size * 0.1);
    }
  }
  rockGeom.computeVertexNormals();
  const rockMat = makeMaterial(0x6B6358, { roughness: 0.95, flatShading: true });
  const rock = new THREE.Mesh(rockGeom, rockMat);
  rock.rotation.x = Math.PI; // 倒置，尖端朝下
  rock.position.y = -size * 0.9 - 0.3;
  rock.castShadow = true;
  rock.receiveShadow = true;
  group.add(rock);

  // ---- 2. 岛底岩石碎片：底部周围散落小石块（3 个足够，不投影）----
  const rubbleMat = makeMaterial(0x5A5248, { roughness: 0.95 });
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2 + Math.random() * 0.5;
    const r = size * (0.5 + Math.random() * 0.3);
    const rubbleSize = 0.3 + Math.random() * 0.4;
    const rubble = new THREE.Mesh(
      new THREE.DodecahedronGeometry(rubbleSize, 0),
      rubbleMat
    );
    rubble.position.set(
      Math.cos(angle) * r,
      -size * 0.3 - Math.random() * 0.5,
      Math.sin(angle) * r
    );
    rubble.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    group.add(rubble);
  }

  // ---- 3. 沙滩层：暖沙色扁平圆柱（边缘略不规则）----
  const beachGeom = new THREE.CylinderGeometry(size * 1.08, size * 1.12, 0.5, 12);
  const beachPos = beachGeom.attributes.position;
  for (let i = 0; i < beachPos.count; i++) {
    const x = beachPos.getX(i);
    const z = beachPos.getZ(i);
    const y = beachPos.getY(i);
    if (Math.abs(y) > 0.15) { // 只位移顶底面边缘
      const angle = Math.atan2(z, x);
      const noise = Math.sin(angle * 5) * 0.08 + Math.cos(angle * 3) * 0.05;
      beachPos.setX(i, x + noise * size);
      beachPos.setZ(i, z + noise * size);
    }
  }
  beachGeom.computeVertexNormals();
  const beachMat = makeMaterial(0xE8D5A8, { roughness: 0.85 });
  const beach = new THREE.Mesh(beachGeom, beachMat);
  beach.position.y = 0.25;
  beach.castShadow = true;
  beach.receiveShadow = true;
  group.add(beach);

  // ---- 4. 草地台地：主色圆柱（略小于沙滩，顶面有起伏）----
  const grassGeom = new THREE.CylinderGeometry(size * 0.92, size * 0.98, 0.7, 12);
  const grassPos = grassGeom.attributes.position;
  // 顶面起伏：让草地表面不是完全平坦
  for (let i = 0; i < grassPos.count; i++) {
    const y = grassPos.getY(i);
    if (y > 0.3) { // 顶面顶点
      const x = grassPos.getX(i);
      const z = grassPos.getZ(i);
      const noise = Math.sin(x * 1.5) * 0.12 + Math.cos(z * 1.3) * 0.1;
      grassPos.setY(i, y + noise);
    }
  }
  grassGeom.computeVertexNormals();
  const grassMat = makeMaterial(grassColor, { roughness: 0.8 });
  const grass = new THREE.Mesh(grassGeom, grassMat);
  grass.position.y = 0.55;
  grass.castShadow = true;
  grass.receiveShadow = true;
  group.add(grass);

  // ---- 5. 高地隆起：偏暗的同色系小台地 ----
  const highlandColor = new THREE.Color(grassColor).multiplyScalar(0.7).getHex();
  const highGeom = new THREE.CylinderGeometry(size * 0.5, size * 0.65, 0.5, 10);
  const highPos = highGeom.attributes.position;
  for (let i = 0; i < highPos.count; i++) {
    const y = highPos.getY(i);
    if (y > 0.2) {
      const x = highPos.getX(i);
      const z = highPos.getZ(i);
      highPos.setY(i, y + Math.sin(x * 2) * 0.08 + Math.cos(z * 1.8) * 0.06);
    }
  }
  highGeom.computeVertexNormals();
  const highMat = makeMaterial(highlandColor, { roughness: 0.75 });
  const high = new THREE.Mesh(highGeom, highMat);
  high.position.y = 1.0;
  high.castShadow = true;
  high.receiveShadow = true;
  group.add(high);

  // ---- 6. 草丛点缀：草地表面散落小草丛 ----
  const tuftColor = new THREE.Color(grassColor).multiplyScalar(1.15).getHex();
  const tuftMat = makeMaterial(tuftColor, { roughness: 0.7 });
  // 数量减半（小物体投影开销大且几乎看不见），关闭投影
  const tuftCount = Math.max(3, Math.floor(size * 0.8));
  for (let i = 0; i < tuftCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = Math.random() * size * 0.8;
    const tuft = new THREE.Mesh(
      new THREE.ConeGeometry(0.15 + Math.random() * 0.1, 0.3 + Math.random() * 0.2, 4),
      tuftMat
    );
    tuft.position.set(
      Math.cos(angle) * r,
      0.95 + Math.random() * 0.1,
      Math.sin(angle) * r
    );
    tuft.rotation.y = Math.random() * Math.PI;
    // 草丛不投影，节省阴影渲染开销
    group.add(tuft);
  }

  // ---- 7. 装饰物（每个岛屿不同）----
  const decor = buildDecor(config.decor, size);
  if (decor) {
    decor.position.y = 1.25;
    group.add(decor);
    group.userData.decor = decor;
  }

  // ---- 8. 3D 文字标签（Sprite，跟随岛屿浮动，透明背景）----
  const label = buildIslandLabel(config);
  group.add(label);
  group.userData.label = label;

  // 标记所有子 mesh 指回 group，便于 raycast 反查
  group.traverse((child) => {
    if (child.isMesh) {
      child.userData.islandGroup = group;
    }
  });

  return group;
}

// ============ 构建装饰物（精细版）============
function buildDecor(type, size) {
  const decorGroup = new THREE.Group();
  const scale = size / 6; // 按岛屿大小缩放装饰物

  switch (type) {
    case 'mountain': {
      // 主岛：多层山体 + 雪顶 + 山脚岩石
      // 主山体：较暗的岩石色
      const mountGeom = new THREE.ConeGeometry(1.8 * scale, 3.5 * scale, 7);
      const mountMat = makeMaterial(0x7A6B5D, { roughness: 0.9 });
      const mountain = new THREE.Mesh(mountGeom, mountMat);
      mountain.position.y = 1.75 * scale;
      mountain.castShadow = true;
      mountain.receiveShadow = true;
      decorGroup.add(mountain);

      // 山腰植被带：中段一圈深绿色
      const beltGeom = new THREE.ConeGeometry(1.2 * scale, 0.8 * scale, 7);
      const beltMat = makeMaterial(0x4A6B3D, { roughness: 0.8 });
      const belt = new THREE.Mesh(beltGeom, beltMat);
      belt.position.y = 1.8 * scale;
      decorGroup.add(belt);

      // 雪顶：白色圆锥
      const snowGeom = new THREE.ConeGeometry(0.7 * scale, 1.2 * scale, 7);
      const snowMat = makeMaterial(0xF0F4F8, { roughness: 0.5, metalness: 0.1 });
      const snow = new THREE.Mesh(snowGeom, snowMat);
      snow.position.y = 3.4 * scale;
      snow.castShadow = true;
      decorGroup.add(snow);

      // 山脚小石块
      const rubbleMat = makeMaterial(0x6B5D4F, { roughness: 0.95 });
      for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2 + 0.5;
        const r = 1.5 * scale;
        const stone = new THREE.Mesh(
          new THREE.DodecahedronGeometry(0.25 * scale, 0),
          rubbleMat
        );
        stone.position.set(Math.cos(angle) * r, 0.2 * scale, Math.sin(angle) * r);
        stone.rotation.set(Math.random(), Math.random(), Math.random());
        stone.castShadow = true;
        decorGroup.add(stone);
      }
      break;
    }
    case 'portal': {
      // 传送门：发光圆环 + 内部漩涡面 + 底座石台
      // 底座石台
      const baseGeom = new THREE.CylinderGeometry(1.1 * scale, 1.3 * scale, 0.4 * scale, 8);
      const baseMat = makeMaterial(0x5A5248, { roughness: 0.9 });
      const base = new THREE.Mesh(baseGeom, baseMat);
      base.position.y = 0.2 * scale;
      base.castShadow = true;
      base.receiveShadow = true;
      decorGroup.add(base);

      // 外圈石环
      const ringGeom = new THREE.TorusGeometry(1.0 * scale, 0.18 * scale, 8, 16);
      const ringMat = makeMaterial(0x4A90E2, {
        emissive: 0x4A90E2,
        emissiveIntensity: 0.7,
        roughness: 0.3,
        metalness: 0.3,
      });
      const ring = new THREE.Mesh(ringGeom, ringMat);
      ring.position.y = 1.8 * scale;
      ring.castShadow = true;
      decorGroup.add(ring);
      decorGroup.userData.spinner = ring;

      // 内部半透明圆面
      const portalGeom = new THREE.CircleGeometry(0.9 * scale, 16);
      const portalMat = new THREE.MeshStandardMaterial({
        color: 0x6BB6FF,
        transparent: true,
        opacity: 0.55,
        emissive: 0x4A90E2,
        emissiveIntensity: 0.9,
        side: THREE.DoubleSide,
        flatShading: true,
        roughness: 0.3,
      });
      const portal = new THREE.Mesh(portalGeom, portalMat);
      portal.position.y = 1.8 * scale;
      decorGroup.add(portal);

      // 两侧立柱
      const pillarMat = makeMaterial(0x6B6358, { roughness: 0.85 });
      [-1, 1].forEach((dir) => {
        const pillar = new THREE.Mesh(
          new THREE.CylinderGeometry(0.15 * scale, 0.18 * scale, 2.0 * scale, 6),
          pillarMat
        );
        pillar.position.set(dir * 1.0 * scale, 1.0 * scale, 0);
        pillar.castShadow = true;
        decorGroup.add(pillar);
      });
      break;
    }
    case 'trees': {
      // 技能岛：3-4 棵精细低多边形树 + 灌木
      const trunkMat = makeMaterial(0x5A3D26, { roughness: 0.9 });
      const leafColors = [0x3A6B3D, 0x4A7B4D, 0x2E5B33];
      const treePositions = [
        { x: -0.9, z: -0.4, s: 1.0 },
        { x: 0.8,  z: 0.5,  s: 0.85 },
        { x: -0.2, z: 1.0,  s: 0.75 },
        { x: 0.3,  z: -0.9, s: 0.65 },
      ];
      treePositions.forEach((p, idx) => {
        const tree = new THREE.Group();
        const ts = p.s * scale;
        // 树干
        const trunk = new THREE.Mesh(
          new THREE.CylinderGeometry(0.18 * ts, 0.22 * ts, 0.9 * ts, 6),
          trunkMat
        );
        trunk.position.y = 0.45 * ts;
        trunk.castShadow = true;
        tree.add(trunk);
        // 树冠：2-3 层圆锥叠加
        const leafMat = makeMaterial(leafColors[idx % leafColors.length], { roughness: 0.75 });
        for (let layer = 0; layer < 3; layer++) {
          const layerRadius = (0.85 - layer * 0.2) * ts;
          const layerHeight = (1.0 - layer * 0.15) * ts;
          const layerY = (1.2 + layer * 0.55) * ts;
          const leaves = new THREE.Mesh(
            new THREE.ConeGeometry(layerRadius, layerHeight, 6),
            leafMat
          );
          leaves.position.y = layerY;
          leaves.castShadow = true;
          tree.add(leaves);
        }
        tree.position.set(p.x, 0, p.z);
        tree.rotation.y = Math.random() * Math.PI;
        decorGroup.add(tree);
      });

      // 灌木点缀
      const bushMat = makeMaterial(0x4A6B3D, { roughness: 0.8 });
      for (let i = 0; i < 3; i++) {
        const angle = Math.random() * Math.PI * 2;
        const r = 1.2 * scale;
        const bush = new THREE.Mesh(
          new THREE.IcosahedronGeometry(0.3 * scale, 0),
          bushMat
        );
        bush.position.set(Math.cos(angle) * r, 0.2 * scale, Math.sin(angle) * r);
        bush.castShadow = true;
        decorGroup.add(bush);
      }
      break;
    }
    case 'castle': {
      // 项目岛：城堡（主体 + 4 塔楼 + 锥形屋顶 + 旗帜 + 城墙）
      // 城堡主体
      const bodyMat = makeMaterial(0xA8A095, { roughness: 0.85 });
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(2.2 * scale, 1.6 * scale, 1.8 * scale),
        bodyMat
      );
      body.position.y = 0.8 * scale;
      body.castShadow = true;
      body.receiveShadow = true;
      decorGroup.add(body);

      // 城垛（顶部齿状装饰）
      const merlonMat = makeMaterial(0x9A9288, { roughness: 0.85 });
      for (let i = -1; i <= 1; i++) {
        const merlon = new THREE.Mesh(
          new THREE.BoxGeometry(0.3 * scale, 0.25 * scale, 0.3 * scale),
          merlonMat
        );
        merlon.position.set(i * 0.6 * scale, 1.7 * scale, 0.95 * scale);
        decorGroup.add(merlon);
      }

      // 4 个角塔
      const towerMat = makeMaterial(0x9A9288, { roughness: 0.8 });
      const roofMat = makeMaterial(0x8B3A2E, { roughness: 0.7 });
      const flagMat = makeMaterial(0xE60012, { roughness: 0.6 });
      const towerPositions = [
        { x: -1.3, z: -0.95 },
        { x: 1.3,  z: -0.95 },
        { x: -1.3, z: 0.95 },
        { x: 1.3,  z: 0.95 },
      ];
      towerPositions.forEach((p, idx) => {
        const tower = new THREE.Mesh(
          new THREE.CylinderGeometry(0.38 * scale, 0.42 * scale, 2.2 * scale, 8),
          towerMat
        );
        tower.position.set(p.x * scale, 1.1 * scale, p.z * scale);
        tower.castShadow = true;
        decorGroup.add(tower);

        // 锥形屋顶
        const roof = new THREE.Mesh(
          new THREE.ConeGeometry(0.5 * scale, 0.8 * scale, 8),
          roofMat
        );
        roof.position.set(p.x * scale, 2.6 * scale, p.z * scale);
        roof.castShadow = true;
        decorGroup.add(roof);

        // 最高塔上的旗帜
        if (idx === 1) {
          const flagPole = new THREE.Mesh(
            new THREE.CylinderGeometry(0.04 * scale, 0.04 * scale, 0.5 * scale, 4),
            merlonMat
          );
          flagPole.position.set(p.x * scale, 3.25 * scale, p.z * scale);
          decorGroup.add(flagPole);

          const flag = new THREE.Mesh(
            new THREE.BoxGeometry(0.35 * scale, 0.22 * scale, 0.02 * scale),
            flagMat
          );
          flag.position.set(p.x * scale + 0.18 * scale, 3.35 * scale, p.z * scale);
          decorGroup.add(flag);
        }
      });

      // 大门
      const doorMat = makeMaterial(0x5A3D26, { roughness: 0.9 });
      const door = new THREE.Mesh(
        new THREE.BoxGeometry(0.5 * scale, 0.8 * scale, 0.1 * scale),
        doorMat
      );
      door.position.set(0, 0.4 * scale, 0.95 * scale);
      decorGroup.add(door);
      break;
    }
    case 'crystal': {
      // 卡片岛：主水晶 + 3 颗小水晶 + 底座光环
      // 底座
      const baseGeom = new THREE.CylinderGeometry(1.0 * scale, 1.2 * scale, 0.3 * scale, 8);
      const baseMat = makeMaterial(0x4A4258, { roughness: 0.85 });
      const base = new THREE.Mesh(baseGeom, baseMat);
      base.position.y = 0.15 * scale;
      base.castShadow = true;
      base.receiveShadow = true;
      decorGroup.add(base);

      // 主水晶：八面体，紫色发光
      const crystalMat = makeMaterial(0x9B7EDE, {
        emissive: 0x9B7EDE,
        emissiveIntensity: 0.8,
        roughness: 0.2,
        metalness: 0.3,
      });
      const crystal = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.9 * scale),
        crystalMat
      );
      crystal.position.y = 1.4 * scale;
      crystal.castShadow = true;
      decorGroup.add(crystal);
      decorGroup.userData.spinner = crystal;

      // 3 颗小水晶围绕主水晶
      const smallMat = makeMaterial(0xB89DEF, {
        emissive: 0x9B7EDE,
        emissiveIntensity: 0.5,
        roughness: 0.25,
        metalness: 0.2,
      });
      for (let i = 0; i < 3; i++) {
        const angle = (i / 3) * Math.PI * 2;
        const small = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.35 * scale),
          smallMat
        );
        small.position.set(
          Math.cos(angle) * 0.8 * scale,
          0.6 * scale,
          Math.sin(angle) * 0.8 * scale
        );
        small.castShadow = true;
        decorGroup.add(small);
      }
      break;
    }
    default:
      return null;
  }

  return decorGroup;
}

// ============ 构建小精灵角色（白色连衣裙小女孩）============
// 可爱小女孩形象：白裙 + 金发 + 翅膀 + 光环，自带光源
// 所有材质支持透明度统一控制（用于穿梭门淡入淡出）
function buildCharacter() {
  const group = new THREE.Group();
  const allMaterials = []; // 收集所有材质，便于统一调透明度

  // 通用注册：记录材质原始 opacity，并加入数组
  const reg = (mat, baseOpacity = 1) => {
    mat.userData.baseOpacity = baseOpacity;
    mat.transparent = true;
    mat.opacity = baseOpacity;
    allMaterials.push(mat);
    return mat;
  };

  // ---- 主白色材质（皮肤 + 连衣裙）：略带自发光，显精灵感 ----
  const whiteMat = reg(new THREE.MeshStandardMaterial({
    color: 0xFFFFFF,
    emissive: 0xF0F0E8,
    emissiveIntensity: 0.25,
    roughness: 0.55,
    metalness: 0,
    flatShading: true,
  }), 1);

  // ---- 金色头发材质 ----
  const hairMat = reg(new THREE.MeshStandardMaterial({
    color: 0xFFE08A,
    emissive: 0xFFD060,
    emissiveIntensity: 0.25,
    roughness: 0.7,
    flatShading: true,
  }), 1);

  // ---- 眼睛：黑色小点 ----
  const eyeMat = reg(new THREE.MeshBasicMaterial({ color: 0x222222 }), 1);

  // ---- 裙子白色稍亮（带轻透感）----
  const dressMat = reg(new THREE.MeshStandardMaterial({
    color: 0xFDFDF8,
    emissive: 0xE8E8DC,
    emissiveIntensity: 0.2,
    roughness: 0.5,
    flatShading: true,
  }), 1);

  // ---- 翅膀：半透明蓝白 ----
  const wingMat = reg(new THREE.MeshStandardMaterial({
    color: 0xDDEEFF,
    emissive: 0x88AAFF,
    emissiveIntensity: 0.35,
    roughness: 0.2,
    side: THREE.DoubleSide,
    flatShading: true,
  }), 0.5);

  // ---- 光环：金色发光 ----
  const haloMat = reg(new THREE.MeshBasicMaterial({
    color: 0xFFE08A,
  }), 0.7);

  // ===== 身体各部分（y=0 在身体腰部中心，方便漂浮）=====

  // ---- 头部：略大的白色球（可爱比例）----
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.38, 16, 12), whiteMat);
  head.position.y = 0.85;
  head.castShadow = true;
  group.add(head);
  group.userData.head = head;

  // ---- 头发：金色半球覆盖头顶 + 后脑 ----
  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55),
    hairMat
  );
  hair.position.y = 0.9;
  hair.castShadow = true;
  group.add(hair);
  // 两个小马尾（金色小球）在两侧
  const tailL = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), hairMat);
  tailL.position.set(-0.38, 1.0, -0.05);
  group.add(tailL);
  const tailR = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), hairMat);
  tailR.position.set(0.38, 1.0, -0.05);
  group.add(tailR);

  // ---- 眼睛：两个黑色小球贴在脸前 ----
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), eyeMat);
  eyeL.position.set(-0.13, 0.88, 0.34);
  group.add(eyeL);
  const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), eyeMat);
  eyeR.position.set(0.13, 0.88, 0.34);
  group.add(eyeR);

  // ---- 连衣裙：上窄下宽圆台（裙摆展开）----
  const dress = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.5, 0.75, 12),
    dressMat
  );
  dress.position.y = 0.15;
  dress.castShadow = true;
  group.add(dress);
  group.userData.dress = dress;
  // 裙摆底边小裙边
  const hem = new THREE.Mesh(
    new THREE.TorusGeometry(0.5, 0.05, 6, 14),
    dressMat
  );
  hem.rotation.x = Math.PI / 2;
  hem.position.y = -0.22;
  group.add(hem);

  // ---- 手臂：两侧小圆柱 ----
  const armL = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.06, 0.5, 6),
    whiteMat
  );
  armL.position.set(-0.32, 0.28, 0);
  armL.rotation.z = 0.35;
  group.add(armL);
  const armR = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.06, 0.5, 6),
    whiteMat
  );
  armR.position.set(0.32, 0.28, 0);
  armR.rotation.z = -0.35;
  group.add(armR);

  // ---- 腿：两条小圆柱（裙下露出）----
  const legL = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.07, 0.45, 6),
    whiteMat
  );
  legL.position.set(-0.13, -0.5, 0);
  group.add(legL);
  const legR = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.07, 0.45, 6),
    whiteMat
  );
  legR.position.set(0.13, -0.5, 0);
  group.add(legR);

  // ---- 翅膀：半透明，左右各一片（比之前大）----
  const wingL = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 6), wingMat);
  wingL.scale.set(0.22, 0.6, 0.45);
  wingL.position.set(-0.45, 0.35, -0.05);
  wingL.rotation.z = 0.4;
  group.add(wingL);
  group.userData.wingL = wingL;
  const wingR = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 6), wingMat);
  wingR.scale.set(0.22, 0.6, 0.45);
  wingR.position.set(0.45, 0.35, -0.05);
  wingR.rotation.z = -0.4;
  group.add(wingR);
  group.userData.wingR = wingR;

  // ---- 头顶光环：金色发光圆环 ----
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.04, 8, 18), haloMat);
  halo.rotation.x = Math.PI / 2;
  halo.position.y = 1.35;
  group.add(halo);
  group.userData.halo = halo;

  // ---- 自带点光源：照亮周围，营造精灵光感 ----
  const light = new THREE.PointLight(0xFFF4D0, 1.0, 8, 1.5);
  light.position.set(0, 0.5, 0);
  group.add(light);

  // 存储所有材质，供穿梭门动画统一控制透明度
  group.userData.allMaterials = allMaterials;
  group.userData.hairMat = hairMat;
  group.userData.dressMat = dressMat;

  return group;
}

// 统一设置精灵透明度（factor 0~1，乘以各材质原始 opacity）
function setCharacterOpacity(factor) {
  const char = state.character;
  if (!char || !char.userData.allMaterials) return;
  char.userData.allMaterials.forEach((mat) => {
    mat.opacity = (mat.userData.baseOpacity ?? 1) * factor;
  });
}

// ============ 构建云朵层 ============
// 程序化生成蓬松云朵：用多个白色软球体组合，半透明，缓慢飘动
// 比贴图更可控，能随主题切换，性能好
function buildClouds() {
  const cloudGroup = new THREE.Group();
  cloudGroup.userData.isClouds = true;

  // 软云材质：高透明度、无光照影响（MeshBasicMaterial）、双层渲染避免排序问题
  const cloudMat = new THREE.MeshBasicMaterial({
    color: 0xFFFFFF,
    transparent: true,
    opacity: 0.75,
    fog: true,
    depthWrite: false,
  });

  // 云朵配置：[x, y, z, scaleX, scaleY, scaleZ]
  // 散布在岛屿上方和远方，营造云海感（精简到 8 朵，每朵 2 球）
  const cloudConfigs = [
    // 高空层（y=12-16）
    [-25, 14, -20, 6, 1.5, 4],
    [22, 15, -18, 7, 1.8, 4.5],
    [-15, 13, 22, 5.5, 1.4, 3.5],
    [28, 16, 20, 6.5, 1.6, 4],
    [0, 17, -28, 8, 2, 5],
    // 中空层（y=8-11）
    [-30, 10, 5, 5, 1.2, 3.5],
    [30, 9, -5, 5.5, 1.3, 4],
    // 远景层（y=6-9，更远更小）
    [38, 8, 12, 4.5, 1.1, 3],
  ];

  const cloudMeshes = [];
  cloudConfigs.forEach((cfg) => {
    // 每朵云用 2 个球体组合（原来 3 个，减一个）
    const cloud = new THREE.Group();
    const [x, y, z, sx, sy, sz] = cfg;

    const puff1 = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6), cloudMat);
    puff1.scale.set(sx, sy, sz);
    cloud.add(puff1);

    const puff2 = new THREE.Mesh(new THREE.SphereGeometry(0.85, 10, 6), cloudMat);
    puff2.position.set(sx * 0.35, -sy * 0.15, sz * 0.2);
    puff2.scale.set(sx * 0.7, sy * 0.85, sz * 0.7);
    cloud.add(puff2);

    cloud.position.set(x, y, z);
    // 随机飘动相位
    cloud.userData = {
      baseX: x,
      driftSpeed: 0.3 + Math.random() * 0.4,
      driftRange: 3 + Math.random() * 4,
      bobOffset: Math.random() * Math.PI * 2,
    };
    cloudGroup.add(cloud);
    cloudMeshes.push(cloud);
  });

  state.cloudMeshes = cloudMeshes;
  return cloudGroup;
}

// ============ 构建远景剪影 ============
// 远处几个小岛剪影，营造"远方还有世界"的景深感
function buildDistantIslands() {
  const group = new THREE.Group();
  // 深色半透明材质，模拟大气透视中的远景
  const silMat = new THREE.MeshBasicMaterial({
    color: 0xA8C0B8,
    transparent: true,
    opacity: 0.35,
    fog: true,
    depthWrite: false,
  });

  // 远景小岛配置：[x, z, size, yOffset]（配合收紧的场景范围）
  const distantConfigs = [
    [-40, -36, 3.5, -2],
    [42, -32, 3, -2.5],
    [-42, 28, 4, -2],
    [40, 36, 2.8, -3],
    [0, -48, 4.5, -2.5],
  ];

  distantConfigs.forEach((cfg) => {
    const [x, z, size, yOffset] = cfg;
    // 简化的倒置锥体 + 扁平圆柱
    const sil = new THREE.Group();
    const rock = new THREE.Mesh(
      new THREE.ConeGeometry(size, size * 1.5, 5),
      silMat
    );
    rock.rotation.x = Math.PI;
    rock.position.y = -size * 0.75;
    sil.add(rock);

    const top = new THREE.Mesh(
      new THREE.CylinderGeometry(size, size, 0.4, 6),
      silMat
    );
    top.position.y = 0.2;
    sil.add(top);

    sil.position.set(x, yOffset, z);
    sil.scale.setScalar(0.8);
    group.add(sil);
  });

  return group;
}

// ============ 创建岛屿 3D 文字标签（Sprite）============
// 用 Canvas 画文字生成贴图，做成 Sprite 添加到岛屿 group 上
// 优势：作为岛屿子元素自动跟随移动/浮动/缩放，透明背景，始终面向相机
// 性能：贴图只生成一次，无每帧 DOM 更新和 project 计算
const _labelCanvasCache = new Map(); // 缓存贴图，避免重复生成

function makeLabelTexture(stage, name, isActive = false) {
  const key = `${stage}|${name}|${isActive ? 'a' : 'n'}`;
  if (_labelCanvasCache.has(key)) return _labelCanvasCache.get(key);

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 192;
  const ctx = canvas.getContext('2d');

  // 透明背景，不填充任何颜色
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 关卡编号（上方小字）
  ctx.font = 'bold 36px "SF Mono", "Consolas", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = isActive ? '#E60012' : 'rgba(80, 70, 60, 0.85)';
  ctx.fillText(stage, canvas.width / 2, 55);

  // 岛屿名称（下方主字）
  ctx.font = 'bold 52px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.fillStyle = isActive ? '#E60012' : 'rgba(40, 35, 30, 0.95)';
  // 文字描边，保证在任何背景上可读
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.lineWidth = 6;
  ctx.strokeText(name, canvas.width / 2, 130);
  ctx.fillText(name, canvas.width / 2, 130);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  _labelCanvasCache.set(key, texture);
  return texture;
}

function buildIslandLabel(cfg) {
  const texture = makeLabelTexture(cfg.stage, cfg.name, false);
  const mat = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,   // 始终显示在场景之上
    depthWrite: false,
    fog: false,         // 不受雾影响，保证远处也能看清
  });
  const sprite = new THREE.Sprite(mat);
  // scale 控制标签在世界空间的大小
  sprite.scale.set(6, 2.25, 1);
  // 位置：装饰物上方（根据 decor 高度调整）
  sprite.position.y = 5.5;
  sprite.userData.islandId = cfg.id;
  sprite.userData.baseStage = cfg.stage;
  sprite.userData.baseName = cfg.name;
  return sprite;
}

// 切换标签激活态（重新生成贴图，红色高亮）
function setLabelActive(sprite, isActive) {
  if (!sprite) return;
  const stage = sprite.userData.baseStage;
  const name = sprite.userData.baseName;
  const texture = makeLabelTexture(stage, name, isActive);
  if (sprite.material.map) sprite.material.map.dispose();
  sprite.material.map = texture;
  sprite.material.needsUpdate = true;
}

// 统一更新激活岛屿（同时更新岛屿缩放和 Sprite 标签高亮）
// islandId 为 null 表示取消激活
function setActiveIsland(islandId) {
  state.activeIslandId = islandId;
  state.islands.forEach((entry) => {
    const isActive = entry.config.id === islandId;
    entry.targetScale = islandId ? (isActive ? 1.15 : 0.9) : 1;
    setLabelActive(entry.group.userData.label, isActive);
  });
}

// ============ 初始化 ============
export function init() {
  // 防止重复初始化
  if (state.initialized) return;
  state.initialized = true;

  try {
    const container = document.querySelector('#map-3d-container');
    if (!container) {
      console.warn('[map3d] 容器 #map-3d-container 未找到，跳过初始化');
      state.initialized = false;
      return;
    }
    state.container = container;

    // ---------- 场景 ----------
    const scene = new THREE.Scene();
    // FogExp2：指数雾，营造更自然的大气透视（远处淡入天空色）
    scene.fog = new THREE.FogExp2(0xE8F0F5, 0.014);
    state.scene = scene;

    // ---------- 相机 ----------
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    // 远裁剪面 120 足够（岛屿范围 ±32 + 远景 ±50），减小可提升深度精度
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 120);
    camera.position.copy(state.initialCameraPos);
    camera.lookAt(0, 0, 0);
    state.camera = camera;

    // ---------- 渲染器 ----------
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    // 限制像素比为 1.5，避免高分屏渲染过多像素（2x 时像素量翻 4 倍，移动端易卡）
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    // PCFShadowMap 比 PCFSoftShadowMap 更快，视觉效果差异不大
    renderer.shadowMap.type = THREE.PCFShadowMap;
    container.appendChild(renderer.domElement);
    state.renderer = renderer;

    // ---------- 灯光（多层光照营造高级氛围感）----------
    // 天空地面光（半球光）：天空偏暖蓝，地面偏暖沙
    const hemi = new THREE.HemisphereLight(0xC8E4F0, 0x9A8A78, 0.7);
    scene.add(hemi);
    state.hemiLight = hemi;

    // 主方向光（带阴影）：模拟阳光，暖白偏金
    const dirLight = new THREE.DirectionalLight(0xFFF4E0, 1.35);
    dirLight.position.set(18, 32, 14);
    dirLight.castShadow = true;
    // 阴影贴图 1024 足够；范围收紧到 ±40（岛屿范围缩小后），同样分辨率下阴影更清晰
    dirLight.shadow.mapSize.set(1024, 1024);
    dirLight.shadow.camera.left = -40;
    dirLight.shadow.camera.right = 40;
    dirLight.shadow.camera.top = 40;
    dirLight.shadow.camera.bottom = -40;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 90;
    dirLight.shadow.bias = -0.0005;
    scene.add(dirLight);
    state.dirLight = dirLight;

    // 环境补光：柔和填充暗部
    const ambient = new THREE.AmbientLight(0xFFFFFF, 0.35);
    scene.add(ambient);
    state.ambientLight = ambient;

    // 暖色侧补光：从左侧打来，为工具区蓝色岛屿增加暖色边缘光，提升立体感
    const fillLight = new THREE.DirectionalLight(0xFFE4B5, 0.35);
    fillLight.position.set(-25, 15, -10);
    scene.add(fillLight);
    state.fillLight = fillLight;

    // ---------- OrbitControls ----------
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 8;
    controls.maxDistance = 75;
    controls.maxPolarAngle = Math.PI / 2.2; // 防止看到底部
    controls.minPolarAngle = Math.PI / 6;   // 防止完全俯视
    controls.target.copy(state.initialCameraTarget);
    // 禁用默认滚轮缩放（步长太小、非线性），改用自定义线性缩放
    controls.enableZoom = false;
    // 平移时在屏幕空间内移动（而非地面平面），放大后拖拽更直观
    controls.screenSpacePanning = true;
    state.controls = controls;

    // ---------- Raycaster ----------
    state.raycaster = new THREE.Raycaster();
    state.pointer = new THREE.Vector2();
    state.clock = new THREE.Clock();

    // ---------- 构建所有岛屿 ----------
    ISLANDS.forEach((cfg) => {
      const island = buildIsland(cfg);
      scene.add(island);
      state.islands.push({
        group: island,
        config: cfg,
        floatOffset: Math.random() * Math.PI * 2, // 浮动相位差
        baseY: 0,
        targetScale: 1,
        currentScale: 1,
      });
    });

    // ---------- 缓存可拾取 mesh 列表（用于点击 raycast，避免每帧 traverse）----------
    state.pickables = [];
    state.islands.forEach((entry) => {
      entry.group.traverse((child) => {
        if (child.isMesh) state.pickables.push(child);
      });
    });

    // ---------- 构建远景剪影（最远层，先加，被雾化）----------
    const distantIslands = buildDistantIslands();
    scene.add(distantIslands);

    // ---------- 构建云朵层 ----------
    const clouds = buildClouds();
    scene.add(clouds);
    state.clouds = clouds;

    // ---------- 构建人物 ----------
    const character = buildCharacter();
    const aboutIsland = ISLANDS.find((i) => i.id === 'about');
    character.position.set(aboutIsland.x, 2.5, aboutIsland.z);
    scene.add(character);
    state.character = character;

    // ---------- 事件绑定 ----------
    bindEvents();

    // ---------- 启动渲染循环 ----------
    animate();

    // ---------- 应用初始主题 ----------
    applyTheme(document.documentElement.getAttribute('data-theme') || 'light');
  } catch (err) {
    console.error('[map3d] 初始化失败：', err);
    state.initialized = false;
  }
}

// ============ 事件绑定 ============
function bindEvents() {
  const canvas = state.renderer.domElement;

  // 点击检测：用 mousedown/mouseup 距离判断，避免拖拽误触发
  // 不用 pointerup，因为 OrbitControls 的 setPointerCapture 会阻止它
  // 旋转中心固定在场景中心（OrbitControls 默认行为）
  let mouseDownPos = null;
  canvas.addEventListener('mousedown', (e) => {
    mouseDownPos = { x: e.clientX, y: e.clientY };
  });
  canvas.addEventListener('click', (e) => {
    if (!mouseDownPos) {
      handleCanvasClick(e);
      return;
    }
    const dx = e.clientX - mouseDownPos.x;
    const dy = e.clientY - mouseDownPos.y;
    mouseDownPos = null;
    // 拖拽超过 6px 不算点击
    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) return;
    handleCanvasClick(e);
  });

  // 自定义滚轮缩放：以鼠标位置为中心进行缩放
  // 每次滚动按当前距离的固定百分比变化，体感均匀
  // 以鼠标所在世界点为焦点，缩放后该点保持在原屏幕位置，便于聚焦观察任意岛屿
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const mouseNDC = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    // deltaY > 0 向下滚动（拉远相机），deltaY < 0 向上滚动（拉近相机）
    const zoomFactor = e.deltaY > 0 ? 1.12 : 1 / 1.12;
    zoomCameraByFactor(zoomFactor, mouseNDC);
  }, { passive: false });

  // 控制按钮：缩放（与滚轮一致的线性比例缩放）
  document.querySelector('.map-control--zoom-in')?.addEventListener('click', (e) => {
    e.stopPropagation();
    zoomCameraByFactor(1 / 1.2);  // 放大场景 = 拉近相机
  });
  document.querySelector('.map-control--zoom-out')?.addEventListener('click', (e) => {
    e.stopPropagation();
    zoomCameraByFactor(1.2);      // 缩小场景 = 拉远相机
  });
  document.querySelector('.map-control--reset')?.addEventListener('click', (e) => {
    e.stopPropagation();
    resetCamera();
  });

  // 全屏页面返回按钮
  document.querySelector('.island-page__back')?.addEventListener('click', (e) => {
    e.stopPropagation();
    closePanel();
  });

  // ESC 关闭全屏页面
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.activeIslandId) closePanel();
  });

  // 响应式
  window.addEventListener('resize', onResize);

  // 主题变化监听
  setupThemeObserver();
}

// ============ 画布点击处理 ============
function handleCanvasClick(event) {
  const rect = state.renderer.domElement.getBoundingClientRect();
  state.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  state.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  state.raycaster.setFromCamera(state.pointer, state.camera);

  // 使用缓存的岛屿 mesh 列表做 raycast（避免每次点击都 traverse 整个场景）
  const intersects = state.raycaster.intersectObjects(state.pickables, false);

  if (intersects.length === 0) {
    // 点击空白处：精灵自由飞过去（射线与漂浮高度平面求交）
    moveCharacterToPointer();
    return;
  }

  const hit = intersects[0].object;
  const islandGroup = hit.userData.islandGroup;
  if (!islandGroup) {
    moveCharacterToPointer();
    return;
  }

  const islandId = islandGroup.userData.id;
  handleIslandClick(islandId);
}

// ============ 精灵自由移动到鼠标点击位置 ============
// 计算射线与漂浮高度水平面（y=2.5）的交点，精灵通过穿梭门到达
function moveCharacterToPointer() {
  if (!state.character || state.isMoving) return;
  // 射线与 y=2.5 平面相交
  const planeY = 2.5;
  const ray = state.raycaster.ray;
  // 射线参数方程：P = origin + t*direction
  // 求 y = planeY 时的 t
  if (Math.abs(ray.direction.y) < 1e-6) return; // 射线与平面平行
  const t = (planeY - ray.origin.y) / ray.direction.y;
  if (t < 0) return; // 交点在相机后方
  const targetX = ray.origin.x + ray.direction.x * t;
  const targetZ = ray.origin.z + ray.direction.z * t;

  // 启动穿梭门动画（不触发岛屿进入）
  moveCharacterViaPortal(new THREE.Vector3(targetX, planeY, targetZ), null);
}

// ============ 岛屿点击交互 ============
// 完整动画序列：
// 1. 更新激活态（缩小其他，放大选中）
// 2. 相机平滑聚焦到目标岛屿
// 3. 人物跳跃移动到目标岛屿（抛物线弧度）
// 4. 人物落地后，延迟 200ms 打开全屏页面（展示岛）或切换到工具页（工具岛）
function handleIslandClick(islandId) {
  const islandEntry = state.islands.find((i) => i.config.id === islandId);
  if (!islandEntry) return;
  const island = islandEntry.config;

  // 如果点击的就是当前所在岛屿，直接打开
  if (state.currentIslandId === islandId) {
    setActiveIsland(islandId);
    enterIsland(island);
    return;
  }

  // 1. 更新激活态
  setActiveIsland(islandId);

  // 2. 相机平滑聚焦
  focusCameraOn(island.x, island.z);

  // 3. 人物跳跃移动，落地后进入
  moveCharacterTo(island, () => {
    setTimeout(() => enterIsland(island), 200);
  });
}

// 进入岛屿：工具岛切换到 tools-view，展示岛打开全屏面板
// showBack: 是否显示"返回地图"按钮（点击3D岛屿=true，Dock菜单直达=false）
function enterIsland(island, showBack = true) {
  if (island.type === 'tool' && toolIslandHandler) {
    toolIslandHandler(island.id);
  } else {
    openPanel(island.id, showBack);
  }
}

// ============ 人物移动（穿梭门模式）============
// 不再飞行：在目标位置开一扇白色发光门，精灵从门里窜出
// onComplete: 动画完成后的回调
function moveCharacterTo(targetIsland, onComplete) {
  state.isMoving = true;
  state.currentIslandId = targetIsland.id;
  const endPos = new THREE.Vector3(targetIsland.x, 2.5, targetIsland.z);
  moveCharacterViaPortal(endPos, onComplete);
}

// ============ 创建穿梭门特效 ============
// 在目标位置生成一扇竖直的白色发光门（圆环 + 内部光面）
function createPortal(position) {
  const door = new THREE.Group();

  // 外圈：发光白色圆环
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xFFFFFF,
    transparent: true,
    opacity: 0,
  });
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.95, 0.08, 10, 28),
    ringMat
  );
  door.add(ring);

  // 内部光面：半透明白色圆面
  const faceMat = new THREE.MeshBasicMaterial({
    color: 0xFFFFFF,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
  });
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.9, 28), faceMat);
  door.add(face);

  // 门初始极小，动画中放大
  door.scale.setScalar(0.01);
  door.position.copy(position);
  // 门朝向相机
  if (state.camera) door.lookAt(state.camera.position);

  state.scene.add(door);
  return { door, ringMat, faceMat };
}

// ============ 精灵穿梭门移动 ============
// 三阶段动画：门出现 → 精灵窜出 → 门消失
function moveCharacterViaPortal(endPos, onComplete) {
  const char = state.character;

  // 先把精灵瞬移到目标位置（但隐藏），门在目标位置生成
  char.position.copy(endPos);
  setCharacterOpacity(0); // 隐藏精灵

  const { door, ringMat, faceMat } = createPortal(endPos);

  state.characterAnim = {
    type: 'portal',
    startTime: performance.now(),
    duration: 750,
    endPos: endPos.clone(),
    door,
    doorMats: [ringMat, faceMat],
    onComplete,
  };
}

// ============ 更新穿梭门动画（在 animate 中调用）============
function updatePortalAnim(a, time) {
  const elapsed = performance.now() - a.startTime;
  const t = Math.min(1, elapsed / a.duration);
  const { door, doorMats } = a;
  const [ringMat, faceMat] = doorMats;

  if (t < 0.35) {
    // 阶段1：门出现（0~35%）
    const k = t / 0.35;
    door.scale.setScalar(0.01 + k * 0.99); // 0.01 → 1
    ringMat.opacity = k;                    // 0 → 1
    faceMat.opacity = k * 0.6;              // 0 → 0.6
    // 精灵保持隐藏
    setCharacterOpacity(0);
  } else if (t < 0.7) {
    // 阶段2：精灵窜出（35%~70%）
    const k = (t - 0.35) / 0.35;
    door.scale.setScalar(1);
    ringMat.opacity = 1;
    faceMat.opacity = 0.6 * (1 - k * 0.5);  // 光面逐渐变淡
    // 精灵淡入 + 从门位置略上窜
    setCharacterOpacity(k);
    const char = state.character;
    const baseY = a.endPos.y;
    char.position.y = baseY - 0.4 + k * 0.4; // 从下方窜上来到目标高度
  } else {
    // 阶段3：门消失（70%~100%）
    const k = (t - 0.7) / 0.3;
    door.scale.setScalar(1 + k * 0.4);       // 略微放大散开
    ringMat.opacity = 1 - k;                  // 1 → 0
    faceMat.opacity = 0;
    setCharacterOpacity(1);
    // 精灵稳定在目标位置
    state.character.position.copy(a.endPos);
  }

  if (t >= 1) {
    // 清理门
    state.scene.remove(door);
    door.traverse((c) => {
      if (c.isMesh) {
        c.geometry.dispose();
        if (c.material) c.material.dispose();
      }
    });
    setCharacterOpacity(1);
    state.character.position.copy(a.endPos);
    state.character.userData.homeX = null; // 重置基准位置，让静止动画重新记录
    state.characterAnim = null;
    state.isMoving = false;
    if (a.onComplete) a.onComplete();
  }
}

// ============ 相机聚焦 ============
// 手动 lerp + requestAnimationFrame（无 GSAP 依赖）
function focusCameraOn(x, z) {
  state.cameraAnim = {
    startTime: performance.now(),
    duration: 800,
    startPos: state.camera.position.clone(),
    endPos: new THREE.Vector3(x, 14, z + 18),
    startTarget: state.controls.target.clone(),
    endTarget: new THREE.Vector3(x, 1, z),
  };
}

// ============ 缩放相机（线性比例缩放）============
// factor > 1：拉远相机（缩小场景）
// factor < 1：拉近相机（放大场景）
// 按当前距离的固定比例缩放，保证任意距离下体感一致
// mouseNDC（可选）：鼠标在画布的 NDC 坐标，传入则以鼠标位置为缩放中心
// 核心改进：参考平面垂直于相机视线、经过 target，而非 y=0 海平面
//   这样鼠标在任何位置（含屏幕中心、岛屿上方）都能准确缩放到该点
//   且缩放后 target 跟随到鼠标位置，旋转中心也随之移动
function zoomCameraByFactor(factor, mouseNDC) {
  const controls = state.controls;
  const camera = state.camera;

  // 无鼠标位置：以 target 为中心缩放
  if (!mouseNDC) {
    const offset = camera.position.clone().sub(controls.target);
    const newLen = Math.max(controls.minDistance, Math.min(controls.maxDistance, offset.length() * factor));
    offset.setLength(newLen);
    camera.position.copy(controls.target).add(offset);
    return;
  }

  // 有鼠标位置：以鼠标对应的世界点为缩放中心
  // 参考平面：经过 target、法线 = 相机视线方向（camera→target），始终面向相机
  const raycaster = state.raycaster;
  const camDir = controls.target.clone().sub(camera.position).normalize(); // 平面法线

  // 求鼠标射线与平面的交点（平面方程：(P - target) · camDir = 0）
  raycaster.setFromCamera(mouseNDC, camera);
  const r1 = raycaster.ray;
  const denom1 = r1.direction.dot(camDir);
  let F0 = null;
  if (Math.abs(denom1) > 1e-6) {
    const t1 = controls.target.clone().sub(r1.origin).dot(camDir) / denom1;
    if (t1 > 0) {
      F0 = r1.origin.clone().add(r1.direction.clone().multiplyScalar(t1));
    }
  }

  // 正常缩放（以 target 为中心移动 camera）
  const offset = camera.position.clone().sub(controls.target);
  const newLen = Math.max(controls.minDistance, Math.min(controls.maxDistance, offset.length() * factor));
  offset.setLength(newLen);
  camera.position.copy(controls.target).add(offset);

  // 缩放后，求同一鼠标 NDC 与新平面的交点 F1，平移 camera+target 使 F0 回到原屏幕位置
  // 注意：缩放后相机位置变了，但 target 未变，平面法线方向不变（camDir 只跟方向有关）
  if (F0) {
    raycaster.setFromCamera(mouseNDC, camera);
    const r2 = raycaster.ray;
    const denom2 = r2.direction.dot(camDir);
    if (Math.abs(denom2) > 1e-6) {
      const t2 = controls.target.clone().sub(r2.origin).dot(camDir) / denom2;
      if (t2 > 0) {
        const F1 = r2.origin.clone().add(r2.direction.clone().multiplyScalar(t2));
        const delta = F0.clone().sub(F1);
        camera.position.add(delta);
        controls.target.add(delta);
      }
    }
  }
}

// 兼容旧接口（保留以防其他地方调用）
function zoomCamera(delta) {
  const controls = state.controls;
  const offset = state.camera.position.clone().sub(controls.target);
  const newLen = Math.max(controls.minDistance, Math.min(controls.maxDistance, offset.length() + delta));
  offset.setLength(newLen);
  state.camera.position.copy(controls.target).add(offset);
}

// ============ 重置相机 ============
function resetCamera() {
  state.cameraAnim = {
    startTime: performance.now(),
    duration: 800,
    startPos: state.camera.position.clone(),
    endPos: state.initialCameraPos.clone(),
    startTarget: state.controls.target.clone(),
    endTarget: state.initialCameraTarget.clone(),
  };
  // 恢复岛屿缩放
  setActiveIsland(null);
  closePanel();
}

// ============ 全屏页面控制 ============
function openPanel(islandId, showBack = true) {
  // 切换显示对应的模块内容
  document.querySelectorAll('.island-page__body').forEach((b) => {
    b.style.display = b.dataset.panel === islandId ? 'block' : 'none';
  });
  const page = document.getElementById('island-page');
  if (page) {
    page.classList.add('is-open');
    page.setAttribute('aria-hidden', 'false');
  }
  // 返回按钮：仅在点击3D岛屿进入时显示，Dock 菜单直达时隐藏
  const backBtn = document.getElementById('island-page-back');
  if (backBtn) {
    if (showBack) {
      backBtn.classList.add('is-visible');
      backBtn.hidden = false;
    } else {
      backBtn.classList.remove('is-visible');
      backBtn.hidden = true;
    }
  }
}

function closePanel() {
  const page = document.getElementById('island-page');
  if (page) {
    page.classList.remove('is-open');
    page.setAttribute('aria-hidden', 'true');
  }
  // 隐藏返回按钮
  const backBtn = document.getElementById('island-page-back');
  if (backBtn) {
    backBtn.classList.remove('is-visible');
    backBtn.hidden = true;
  }
  // 恢复岛屿缩放和标签
  setActiveIsland(null);
}

// ============ 响应式 ============
function onResize() {
  const { container, camera, renderer } = state;
  if (!container || !camera || !renderer) return;
  const width = container.clientWidth || window.innerWidth;
  const height = container.clientHeight || window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

// ============ 暗色模式适配 ============
// 监听 document.documentElement 的 data-theme 属性变化
function setupThemeObserver() {
  applyTheme(document.documentElement.getAttribute('data-theme') || 'light');
  const observer = new MutationObserver(() => {
    applyTheme(document.documentElement.getAttribute('data-theme') || 'light');
  });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
}

function applyTheme(theme) {
  if (!state.scene) return;
  if (theme === 'dark') {
    // 夜空雾色：深蓝，让远景淡入夜空
    state.scene.fog.color.set(0x0A1428);
    if (state.dirLight) {
      state.dirLight.intensity = 0.6;
      state.dirLight.color.set(0x9AB4D6); // 冷月光
    }
    if (state.ambientLight) state.ambientLight.intensity = 0.12;
    if (state.hemiLight) {
      state.hemiLight.color.set(0x4A6A9A);  // 冷月光天空光
      state.hemiLight.intensity = 0.4;
    }
    // 夜间暖色补光转为冷蓝月光补光
    if (state.fillLight) {
      state.fillLight.intensity = 0.15;
      state.fillLight.color.set(0x6A8AB8);
    }
    // 云朵变暗（夜间云）
    if (state.cloudMeshes) {
      state.cloudMeshes.forEach((cloud) => {
        cloud.traverse((c) => {
          if (c.isMesh && c.material) c.material.color.set(0x6A7A9A);
        });
      });
    }
  } else {
    // 晨曦雾色：淡天蓝，让远景淡入天空
    state.scene.fog.color.set(0xE8F0F5);
    if (state.dirLight) {
      state.dirLight.intensity = 1.35;
      state.dirLight.color.set(0xFFF4E0); // 暖白偏金阳光
    }
    if (state.ambientLight) state.ambientLight.intensity = 0.35;
    if (state.hemiLight) {
      state.hemiLight.color.set(0xC8E4F0);  // 暖蓝天空光
      state.hemiLight.intensity = 0.7;
    }
    // 日间暖色侧补光
    if (state.fillLight) {
      state.fillLight.intensity = 0.35;
      state.fillLight.color.set(0xFFE4B5);
    }
    // 云朵恢复白色
    if (state.cloudMeshes) {
      state.cloudMeshes.forEach((cloud) => {
        cloud.traverse((c) => {
          if (c.isMesh && c.material) c.material.color.set(0xFFFFFF);
        });
      });
    }
  }
}

// ============ 渲染循环 ============
function animate() {
  requestAnimationFrame(animate);
  // 仅用 getElapsedTime，避免与 getDelta 互相干扰
  const time = state.clock.getElapsedTime();

  // ---------- 岛屿浮动 + 缩放过渡 + 装饰物旋转 ----------
  state.islands.forEach((entry) => {
    // 缓慢上下浮动
    const floatY = Math.sin(time * 1.2 + entry.floatOffset) * 0.3;
    entry.group.position.y = entry.baseY + floatY;

    // 缩放过渡（激活态放大 / 非激活态缩小）
    entry.currentScale += (entry.targetScale - entry.currentScale) * 0.1;
    entry.group.scale.setScalar(entry.currentScale);

    // 装饰物轻微旋转（水晶、传送门圆环）
    const spinner = entry.group.userData.decor?.userData.spinner;
    if (spinner) spinner.rotation.y += 0.02;
  });

  // ---------- 云朵缓慢飘动 + 上下浮动 ----------
  if (state.cloudMeshes) {
    state.cloudMeshes.forEach((cloud) => {
      const ud = cloud.userData;
      // 横向缓慢飘移（余弦循环，来回摆动而非单向）
      cloud.position.x = ud.baseX + Math.sin(time * ud.driftSpeed) * ud.driftRange;
      // 轻微上下浮动
      cloud.position.y += Math.sin(time * 0.5 + ud.bobOffset) * 0.003;
    });
  }

  // ---------- 人物移动动画 ----------
  if (state.characterAnim) {
    if (state.characterAnim.type === 'portal') {
      // 穿梭门动画：门出现 → 精灵窜出 → 门消失
      updatePortalAnim(state.characterAnim, time);
      // 窜出时翅膀快速扇动
      const char = state.character;
      if (char.userData.wingL && char.userData.wingR) {
        const flap = Math.sin(time * 28) * 0.5;
        char.userData.wingL.rotation.z = 0.4 + flap;
        char.userData.wingR.rotation.z = -0.4 - flap;
      }
    } else {
      // 兼容旧格式（跳跃），实际已不再使用
      const a = state.characterAnim;
      const t = Math.min(1, (performance.now() - a.startTime) / a.duration);
      state.character.position.lerpVectors(a.startPos, a.endPos, t);
      const arc = Math.sin(t * Math.PI) * 3;
      state.character.position.y = a.startPos.y + (a.endPos.y - a.startPos.y) * t + arc;
      if (t >= 1) {
        state.characterAnim = null;
        state.isMoving = false;
        state.character.position.copy(a.endPos);
        state.character.userData.homeX = null;
        if (a.onComplete) a.onComplete();
      }
    }
  } else {
    // ---- 静止时漂浮动画（多轴浮动 + 翅膀扇动 + 光环旋转 + 裙摆微摆）----
    const char = state.character;
    // 记录基准位置（每次停止后更新一次）
    if (char.userData.homeX === undefined || char.userData.homeX === null) {
      char.userData.homeX = char.position.x;
      char.userData.homeY = char.position.y;
      char.userData.homeZ = char.position.z;
    }
    const baseY = char.userData.homeY;
    // y 轴缓慢上下浮动（呼吸感）
    char.position.y = baseY + Math.sin(time * 1.8) * 0.2;
    // x/z 轴轻微摆动（随风飘动感，基于基准位置不漂移）
    char.position.x = char.userData.homeX + Math.sin(time * 0.9) * 0.14;
    char.position.z = char.userData.homeZ + Math.cos(time * 0.7) * 0.12;
    // 整体轻微左右摇摆（小女孩飘动感）
    char.rotation.z = Math.sin(time * 1.2) * 0.1;
    char.rotation.y = Math.sin(time * 0.5) * 0.25; // 缓慢转头张望

    // 翅膀扇动动画（慢速优雅扇动）
    if (char.userData.wingL && char.userData.wingR) {
      const flap = Math.sin(time * 8) * 0.35;
      char.userData.wingL.rotation.z = 0.4 + flap;
      char.userData.wingR.rotation.z = -0.4 - flap;
      char.userData.wingL.rotation.x = Math.sin(time * 8) * 0.15;
      char.userData.wingR.rotation.x = -Math.sin(time * 8) * 0.15;
    }
    // 光环缓慢旋转 + 呼吸
    if (char.userData.halo) {
      char.userData.halo.rotation.z = time * 0.8;
      const baseOp = char.userData.halo.material.userData.baseOpacity ?? 0.7;
      char.userData.halo.material.opacity = baseOp + Math.sin(time * 2) * 0.15;
    }
    // 裙摆微摆（连衣裙轻微摇摆）
    if (char.userData.dress) {
      char.userData.dress.rotation.z = Math.sin(time * 1.4) * 0.06;
    }
  }

  // ---------- 相机动画 ----------
  if (state.cameraAnim) {
    const a = state.cameraAnim;
    const t = Math.min(1, (performance.now() - a.startTime) / a.duration);
    // easeInOutCubic 缓动
    const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    state.camera.position.lerpVectors(a.startPos, a.endPos, e);
    state.controls.target.lerpVectors(a.startTarget, a.endTarget, e);
    if (t >= 1) {
      state.cameraAnim = null;
    }
  }

  state.controls.update();
  state.renderer.render(state.scene, state.camera);
}

// ============ 外部触发岛屿点击 ============
// 供 dock 导航等外部调用：通过岛屿 id 触发点击交互（含跳岛动画）
export function gotoIsland(islandId) {
  if (!state.initialized) {
    console.warn('[map3d] 尚未初始化，无法跳转岛屿');
    return;
  }
  const entry = state.islands.find((i) => i.config.id === islandId);
  if (!entry) {
    console.warn('[map3d] 找不到岛屿:', islandId);
    return;
  }
  handleIslandClick(islandId);
}

// 直接进入某岛屿（跳过跳岛动画，供 Dock 菜单直达）
// 工具岛 → 切换到 tools-view；展示岛 → 打开全屏页面（无返回按钮）
export function gotoIslandDirect(islandId) {
  if (!state.initialized) {
    console.warn('[map3d] 尚未初始化，无法跳转岛屿');
    return;
  }
  const entry = state.islands.find((i) => i.config.id === islandId);
  if (!entry) {
    console.warn('[map3d] 找不到岛屿:', islandId);
    return;
  }
  // 更新状态：人物与激活态直接对齐目标岛屿，不播放移动动画
  state.currentIslandId = islandId;
  setActiveIsland(islandId);
  // 人物瞬间移动到目标岛屿位置（无跳跃动画）
  if (state.character) {
    state.character.position.set(entry.config.x, 2.5, entry.config.z);
  }
  // 相机聚焦到目标岛屿（无跳跃，仅平滑过渡）
  focusCameraOn(entry.config.x, entry.config.z);
  // 进入岛屿（Dock 菜单直达不显示返回按钮）
  enterIsland(entry.config, false);
}

// 重置到初始岛屿状态（关闭所有打开的岛屿页面，相机回到原点）
export function resetToHome() {
  if (!state.initialized) return;
  resetCamera();
}

// ============ 自动初始化 ============
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
