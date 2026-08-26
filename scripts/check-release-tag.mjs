import { readFile } from "node:fs/promises";

const manifest = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const expected = `v${manifest.version}`;
const actual = process.env.RELEASE_TAG ?? "";

if (actual !== expected) {
  console.error(`release tag와 package version 불일치: ${actual || "(없음)"} != ${expected}`);
  process.exit(1);
}

console.log(`release version 확인: ${actual}`);
