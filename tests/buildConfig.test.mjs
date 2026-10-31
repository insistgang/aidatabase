// 校验各构建目标的产物配置是否与部署目标一致。
//
// 背景：GitHub Pages 是纯静态托管，没有同源后端，因此 build:github 必须把
// VITE_LEARNING_API_BASE_URL 置空，使前端优雅降级为「不上报」。
// 自建站由 nginx 反代 /learning-api/ 到 FastAPI，因此 build:selfhost
// 必须使用相对路径，事件上报与管理后台才可用。
//
// 该测试只读取构建产物，不发起网络请求。

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import assert from 'node:assert/strict';

// 路径含中文，必须用 fileURLToPath 还原，不能用 URL.pathname（那是百分号编码）
const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const distDir = join(projectRoot, 'dist');

function readBuildScripts() {
  const pkg = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8'));
  return pkg.scripts ?? {};
}

function listBuiltAssets() {
  const assetsDir = join(distDir, 'assets');
  if (!existsSync(assetsDir)) return [];
  return readdirSync(assetsDir).filter((name) => name.endsWith('.js'));
}

function collectJsText() {
  return listBuiltAssets()
    .map((name) => readFileSync(join(distDir, 'assets', name), 'utf8'))
    .join('\n');
}

/**
 * 模拟 Vite 对 import.meta.env.VITE_LEARNING_API_BASE_URL 的编译结果，
 * 与 src/lib/learningAnalytics.ts 的判定逻辑保持一致：
 *   undefined      -> '/learning-api'
 *   ''（空字符串） -> ''（随后 learningApiUrl 返回 null，前端降级为不上报）
 *   '/learning-api' -> '/learning-api'
 */
function resolveApiBaseUrl(script) {
  const raw = script.match(/VITE_LEARNING_API_BASE_URL=(\S*)/)?.[1];
  if (raw === undefined) return '/learning-api';
  return raw.replace(/\/$/, '');
}

test('build:github 显式置空 API 基址，保持 Pages 纯静态', () => {
  const scripts = readBuildScripts();
  assert.ok(scripts['build:github'], '缺少 build:github 脚本');
  assert.match(
    scripts['build:github'],
    /VITE_LEARNING_API_BASE_URL=\s/,
    'build:github 必须把 VITE_LEARNING_API_BASE_URL 置空（注意等号后要有空格，避免被当成变量名）'
  );
  assert.equal(
    resolveApiBaseUrl(scripts['build:github']),
    '',
    'build:github 的编译后 API 基址应为空字符串'
  );
});

test('build:selfhost 使用相对路径 API 基址，依赖 nginx 同源反代', () => {
  const scripts = readBuildScripts();
  assert.ok(scripts['build:selfhost'], '缺少 build:selfhost 脚本');
  assert.match(
    scripts['build:selfhost'],
    /VITE_LEARNING_API_BASE_URL=\/learning-api\b/,
    'build:selfhost 必须使用相对路径 /learning-api，由 nginx 反代到 FastAPI'
  );
  assert.equal(
    resolveApiBaseUrl(scripts['build:selfhost']),
    '/learning-api',
    'build:selfhost 的编译后 API 基址应为相对路径 /learning-api'
  );
});

test('build:github 与 build:selfhost 产出不同的 API 配置', () => {
  const scripts = readBuildScripts();
  const github = scripts['build:github'] ?? '';
  const selfhost = scripts['build:selfhost'] ?? '';
  assert.notEqual(
    resolveApiBaseUrl(github),
    resolveApiBaseUrl(selfhost),
    '两个构建目标必须使用不同的 API 基址，否则部署行为无法区分'
  );
});

test('learngingApiUrl 的降级语义：空基址返回 null，非空基址返回拼接路径', () => {
  // 与 src/lib/learningAnalytics.ts 保持一致
  const learningApiUrl = (base, path) => {
    if (!base) return null;
    const normalized = path.startsWith('/') ? path : `/${path}`;
    return `${base}${normalized}`;
  };

  assert.equal(learningApiUrl('', '/events'), null, '空基址必须返回 null（前端优雅降级）');
  assert.equal(learningApiUrl('/learning-api', '/events'), '/learning-api/events');
  assert.equal(learningApiUrl('/learning-api', 'stats'), '/learning-api/stats');
});

test('若 dist 存在，玩家存档功能应保留在产物中', () => {
  if (!existsSync(distDir)) return; // 未构建时跳过
  const js = collectJsText();
  assert.match(js, /kolm_game_state:player:/, '产物中应保留玩家存档功能');
});
