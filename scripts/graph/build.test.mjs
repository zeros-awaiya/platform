// build.mjs の試験: 空 staging の削除が Dropbox ロック(EBUSY)で失敗しても再試行すること
// 使い方: npm run graph:test（一時ディレクトリだけを使い、本物の Dropbox には書かない）
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const buildScript = fileURLToPath(new URL("./build.mjs", import.meta.url));

// 空 staging の rmdirSync だけを EBUSY_COUNT 回 EBUSY で失敗させるスタブ（負数なら常に失敗）
const STUB_SOURCE = `
import fs from "node:fs";
import path from "node:path";
const realRmdirSync = fs.rmdirSync;
let remaining = Number(process.env.EBUSY_COUNT);
fs.rmdirSync = (target, ...rest) => {
  if (path.basename(String(target)) === "staging" && remaining !== 0) {
    remaining -= 1;
    const error = new Error("EBUSY: resource busy or locked, rmdir (stub)");
    error.code = "EBUSY";
    throw error;
  }
  return realRmdirSync(target, ...rest);
};
`;

function runBuildWithEbusy(ebusyCount) {
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "graph-build-test-"));
  const rootDir = path.join(workDir, "root");
  fs.mkdirSync(rootDir);
  fs.writeFileSync(path.join(rootDir, "note.md"), "# note\n", "utf8");
  const stubPath = path.join(workDir, "ebusy-stub.mjs");
  fs.writeFileSync(stubPath, STUB_SOURCE, "utf8");

  const result = spawnSync(
    process.execPath,
    ["--import", pathToFileURL(stubPath).href, buildScript, "--root", rootDir],
    { encoding: "utf8", env: { ...process.env, EBUSY_COUNT: String(ebusyCount) } }
  );
  const stagingExists = fs.existsSync(path.join(rootDir, "graph", "staging"));
  fs.rmSync(workDir, { recursive: true, force: true });
  return { ...result, stagingExists };
}

test("空 staging の削除が EBUSY で2回失敗しても、再試行して成功する", () => {
  const result = runBuildWithEbusy(2);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /空stagingの削除 が EBUSY で失敗/);
  assert.equal(result.stagingExists, false);
});

test("EBUSY が続くときは再試行を使い切って失敗を上げる（隠さない）", () => {
  const result = runBuildWithEbusy(-1);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /EBUSY/);
  assert.equal(result.stagingExists, true);
});
