// ai-grade.js
// AI 评级服务 — 对用户感悟进行打分并返回等级
// 预留 API 接入点：当前为本地模拟评级，后续接入真实 AI API

/**
 * 评级维度：
 * 1. 深度（是否有本质洞察 vs 表面陈述）
 * 2. 原创性（是否有独立观点 vs 套话陈词）
 * 3. 相关性（是否紧扣关键词 vs 偏题）
 * 4. 表达（是否有文采/逻辑 vs 流水账）
 *
 * 每维度 0-100，总分加权后映射到 SSS/S/A/B/C/D/E
 */

const GRADE_THRESHOLDS = [
  { grade: 'SSS', min: 92 },
  { grade: 'S',   min: 82 },
  { grade: 'A',   min: 72 },
  { grade: 'B',   min: 60 },
  { grade: 'C',   min: 45 },
  { grade: 'D',   min: 30 },
  { grade: 'E',   min: 0  },
];

// 评级点评模板（按等级）
const GRADE_COMMENTS = {
  SSS: ['震撼的洞察，直击本质。', '罕见的深度与文采兼备。', '这是一段值得反复品读的思考。'],
  S:   ['深刻的洞察，表达精炼。', '独立思考，逻辑清晰。', '有穿透力的观点。'],
  A:   ['有独立思考，逻辑清晰。', '切中要害，表达到位。', '不错的深度，略有启发。'],
  B:   ['有一定思考，切题。', '基本到位，可再深入。', '方向正确，深度可挖。'],
  C:   ['基本切题，思考较浅。', '停留在表面，可挖更深。', '有点想法，但不够清晰。'],
  D:   ['有些偏题，或流于表面。', '更像陈述，少了思考。', '可以更聚焦关键词。'],
  E:   ['偏题严重或较为空洞。', '建议重新审视关键词。', '思考空间还很大。'],
};

/**
 * 本地模拟评级（API 未接入时使用）
 * 基于文本长度、句式多样性、关键词相关性做启发式评分
 * @param {string} text - 用户感悟
 * @param {string} keyword - 抽到的关键词
 * @returns {Promise<{grade, scores, comment}>}
 */
function mockGrade(text, keyword) {
  const scores = {
    depth: 0,
    originality: 0,
    relevance: 0,
    expression: 0,
  };

  const cleanText = text.trim();
  const len = cleanText.length;

  // 1. 深度：长度 + 转折词 + 问号（自问自答 = 深度信号）
  const questions = (cleanText.match(/？/g) || []).length;
  const transitions = (cleanText.match(/但是|然而|其实|本质|真正|反而|换句话说|深层次/g) || []).length;
  scores.depth = Math.min(100, len * 0.3 + questions * 15 + transitions * 12 + 20);

  // 2. 原创性：避免套话，用词多样性
  const cliches = (cleanText.match(/众所周知|毋庸置疑|不言而喻|随着.*的发展|在当今社会/g) || []).length;
  const uniqueChars = new Set(cleanText).size;
  scores.originality = Math.max(10, Math.min(100, uniqueChars * 1.8 + 30 - cliches * 20));

  // 3. 相关性：关键词出现 + 同根词
  const kwInText = cleanText.includes(keyword);
  const kwChars = keyword.split('').filter((c) => cleanText.includes(c)).length;
  scores.relevance = kwInText ? 80 + Math.min(20, kwChars * 4) : Math.min(60, kwChars * 12);

  // 4. 表达：句子数量 + 标点多样性 + 平均句长
  const sentences = cleanText.split(/[。！？；]/).filter((s) => s.length > 2).length;
  const punctTypes = new Set((cleanText.match(/[，。！？；：、""''（）—…]/g) || [])).size;
  const avgLen = sentences > 0 ? len / sentences : len;
  scores.expression = Math.min(100, sentences * 10 + punctTypes * 8 + (avgLen > 10 && avgLen < 50 ? 25 : 10));

  // 总分加权
  const total = Math.round(
    scores.depth * 0.30 +
    scores.originality * 0.25 +
    scores.relevance * 0.25 +
    scores.expression * 0.20
  );

  // 映射等级
  const grade = GRADE_THRESHOLDS.find((g) => total >= g.min)?.grade || 'E';

  // 随机选点评
  const comments = GRADE_COMMENTS[grade];
  const comment = comments[Math.floor(Math.random() * comments.length)];

  return Promise.resolve({ grade, scores, total, comment });
}

/**
 * AI 评级入口
 * @param {string} text - 用户感悟
 * @param {string} keyword - 关键词
 * @param {Object} options - { apiEndpoint, apiKey }（预留）
 * @returns {Promise<{grade, scores, total, comment}>}
 */
export async function gradeInsight(text, keyword, options = {}) {
  // TODO: 接入真实 AI API
  // 当 options.apiEndpoint 和 options.apiKey 提供时，调用远程 API
  // 请求体：{ keyword, text }，响应：{ grade, scores, comment }
  //
  // if (options.apiEndpoint && options.apiKey) {
  //   return fetch(options.apiEndpoint, {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${options.apiKey}` },
  //     body: JSON.stringify({ keyword, text }),
  //   }).then((r) => r.json());
  // }

  // 当前使用本地模拟评级
  // 模拟网络延迟，让等待有仪式感
  await new Promise((resolve) => setTimeout(resolve, 1200 + Math.random() * 800));
  return mockGrade(text, keyword);
}

export { GRADE_THRESHOLDS };
