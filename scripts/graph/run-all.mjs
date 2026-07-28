// 全工程実行: build → validate → render を同じ引数で順に実行する
// 使い方: node scripts/graph/run-all.mjs [--root <path>]
// （npm run graph -- --root <path> で --root が全工程に渡る）
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);

for (const script of ["build.mjs", "validate.mjs", "render.mjs"]) {
  const result = spawnSync(process.execPath, [path.join(here, script), ...args], {
    stdio: "inherit",
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
