#!/usr/bin/env node
// .claude/ 内の壊れたリンクや旧ディレクトリ参照を検出する。
// 実行: node .claude/scripts/lint-claude.mjs
// 終了コード: 0 = 問題なし / 1 = 問題あり

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..', '..');
const claudeDir = join(projectRoot, '.claude');

let errors = 0;
const report = (file, msg) => {
  console.error(`x ${relative(projectRoot, file)}: ${msg}`);
  errors++;
};

const SKIP_DIRS = new Set(['node_modules']);

// skills/<name>/ 直下に LICENSE か LICENSE.txt があれば Anthropic 公式の上流 skill
// として扱い、スキャン対象外にする (改変不可)。自前 skill は SKILL.md だけ持つので
// 通常スキャンされる。
function isUpstreamSkill(skillDir) {
  for (const lic of ['LICENSE', 'LICENSE.txt']) {
    try {
      if (statSync(join(skillDir, lic)).isFile()) return true;
    } catch {}
  }
  return false;
}

function walk(dir, parentName = '') {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) {
      if (SKIP_DIRS.has(name) || name.startsWith('.')) continue;
      if (parentName === 'skills' && isUpstreamSkill(p)) continue;
      out.push(...walk(p, name));
    } else if (name.endsWith('.md')) {
      out.push(p);
    }
  }
  return out;
}

// 他プロジェクト (PairBrush) から持ち込まれた記述が残っていないか。
// storyline は単一パッケージ構成なので tool/ frontend/ backend/ rust/ は存在しない。
const stalePatterns = [
  /pairbrush/i,
  /\bcd\s+(tool|frontend|backend|rust)\b/,
  /npm\s+--prefix\s+(tool|frontend|backend)\b/,
  /\b(tool|frontend|backend)\/src\//,
];

// 旧 agent / skill 名 (リネーム・削除済み)
const staleFrameworks = [
  /\bweb-(component|hook)-builder\b/,
  /\bweb-test-writer\b/,
  /\bai-dept\b/,
];

const files = walk(claudeDir);

for (const f of files) {
  const content = readFileSync(f, 'utf8');

  for (const re of stalePatterns) {
    if (re.test(content)) report(f, `stale dir reference matches /${re.source}/`);
  }
  for (const re of staleFrameworks) {
    if (re.test(content)) report(f, `stale framework reference matches /${re.source}/`);
  }

  // markdown リンク `[...](path)` のうち、http(s):// と # 内部リンク以外を実ファイル検証
  const linkRe = /\[[^\]]+\]\((?!https?:|mailto:|#)([^)]+)\)/g;
  let m;
  while ((m = linkRe.exec(content)) !== null) {
    const raw = m[1].split('#')[0].split('?')[0].trim();
    if (!raw) continue;
    const resolved = resolve(dirname(f), raw);
    try {
      statSync(resolved);
    } catch {
      report(f, `broken link -> ${m[1]}`);
    }
  }
}

if (errors > 0) {
  console.error(`\n${errors} issue(s) found in .claude/`);
  process.exit(1);
}
console.log(`OK: .claude/ lint passed (${files.length} files scanned)`);
