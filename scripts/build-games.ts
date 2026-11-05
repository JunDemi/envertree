/**
 * games/* 의 게임을 빌드해 apps/portal/public/play/<slug>/ 로 복사한다.
 *
 *   node scripts/build-games.ts                 # 모든 게임 빌드
 *   node scripts/build-games.ts sample other    # 지정한 게임만
 *   node scripts/build-games.ts --missing-only  # 아직 복사된 적 없는 게임만 (pnpm dev가 사용)
 *
 * 규칙
 * - 폴더 이름 = slug = 포털 주소(/games/<slug>). 소문자, 숫자, 하이픈만.
 * - "_"나 "."로 시작하는 폴더(_template 등)는 건너뛴다.
 * - 각 게임은 package.json의 "build" 스크립트로 dist/ 에 결과물을 만들어야 한다.
 * - public/play 안에서 이 스크립트가 만든 게 아닌 폴더(예: dummy)는 건드리지 않는다.
 *
 * Node 22.18+ 는 TypeScript를 바로 실행하므로 타입 전용 문법만 사용한다.
 */
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const gamesDir = join(root, "games");
const playDir = join(root, "apps", "portal", "public", "play");
const registryFile = join(root, "apps", "portal", "src", "lib", "games.ts");

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const args = process.argv.slice(2);
const missingOnly = args.includes("--missing-only");
const requested = args.filter((a) => !a.startsWith("--"));

function log(message: string) {
  console.log(`[build-games] ${message}`);
}

function fail(message: string): never {
  console.error(`[build-games] ✖ ${message}`);
  process.exit(1);
}

/** games/ 아래 빌드 대상 폴더 목록 */
function findGames(): string[] {
  if (!existsSync(gamesDir)) return [];
  return readdirSync(gamesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !/^[_.]/.test(entry.name))
    .filter((entry) => existsSync(join(gamesDir, entry.name, "package.json")))
    .map((entry) => entry.name)
    .sort();
}

/** 레지스트리에 등록된 slug 목록 (등록 누락 경고용) */
function registeredSlugs(): Set<string> {
  if (!existsSync(registryFile)) return new Set();
  const source = readFileSync(registryFile, "utf8");
  return new Set([...source.matchAll(/slug:\s*["']([^"']+)["']/g)].map((m) => m[1]));
}

function buildGame(slug: string) {
  const gameDir = join(gamesDir, slug);
  const pkg = JSON.parse(readFileSync(join(gameDir, "package.json"), "utf8")) as {
    scripts?: Record<string, string>;
  };
  if (!pkg.scripts?.build) fail(`games/${slug}/package.json 에 "build" 스크립트가 없습니다.`);

  log(`▶ ${slug} 빌드 중...`);
  const result = spawnSync("pnpm", ["run", "build"], {
    cwd: gameDir,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) fail(`${slug} 빌드 실패 (exit ${result.status ?? result.signal})`);

  const distDir = join(gameDir, "dist");
  if (!existsSync(join(distDir, "index.html"))) {
    fail(`games/${slug}/dist/index.html 이 없습니다. 빌드 결과가 dist/ 에 생기는지 확인하세요.`);
  }

  const target = join(playDir, slug);
  rmSync(target, { recursive: true, force: true });
  cpSync(distDir, target, { recursive: true });
  log(`✔ ${slug} → ${relative(root, target)}`);
}

function main() {
  const all = findGames();

  for (const slug of all) {
    if (!SLUG_PATTERN.test(slug)) {
      fail(`games/${slug}: 폴더 이름은 소문자, 숫자, 하이픈만 쓸 수 있습니다 (slug로 사용됨).`);
    }
  }

  for (const slug of requested) {
    if (!all.includes(slug)) fail(`games/${slug} 를 찾을 수 없습니다. (있는 게임: ${all.join(", ") || "없음"})`);
  }

  let targets = requested.length > 0 ? requested : all;
  if (missingOnly) {
    targets = targets.filter((slug) => !existsSync(join(playDir, slug, "index.html")));
  }

  if (targets.length === 0) {
    log(missingOnly ? "모든 게임이 이미 빌드되어 있습니다." : "빌드할 게임이 없습니다.");
    return;
  }

  const registered = registeredSlugs();
  for (const slug of targets) {
    buildGame(slug);
    if (!registered.has(slug)) {
      console.warn(
        `[build-games] ⚠ ${slug} 가 레지스트리에 없습니다. apps/portal/src/lib/games.ts 에 등록해야 포털에 나타납니다.`,
      );
    }
  }
  log(`완료: ${targets.length}개 게임`);
}

main();
