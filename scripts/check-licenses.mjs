import { access } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const ALLOWED_LICENSES = new Set([
  "Apache-2.0",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "ISC",
  "MIT",
  "OFL-1.1",
]);

const REQUIRED_NOTICES = [
  "LICENSE",
  "NOTICE",
  "apps/web/public/Pretendard-LICENSE.txt",
];

for (const file of REQUIRED_NOTICES) {
  try {
    await access(resolve(file));
  } catch {
    console.error(`필수 라이선스 고지 파일 누락: ${file}`);
    process.exit(1);
  }
}

const executable = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const result = spawnSync(
  process.platform === "win32" ? `${executable} licenses list --prod --json` : executable,
  process.platform === "win32" ? [] : ["licenses", "list", "--prod", "--json"],
  {
  cwd: process.cwd(),
  encoding: "utf8",
  // Windows launches .cmd shims through cmd.exe. Arguments are fixed constants, not user input.
  shell: process.platform === "win32",
  },
);

if (result.status !== 0) {
  console.error(result.stderr || result.error?.message || "의존성 라이선스 목록을 생성하지 못했습니다.");
  process.exit(result.status ?? 1);
}

let licenses;
try {
  licenses = JSON.parse(result.stdout);
} catch (error) {
  console.error(`라이선스 결과를 해석하지 못했습니다: ${error.message}`);
  process.exit(1);
}

const rejected = Object.entries(licenses).filter(([license]) => !ALLOWED_LICENSES.has(license));
if (rejected.length > 0) {
  console.error("허용 목록에 없는 프로덕션 의존성 라이선스 발견:");
  for (const [license, packages] of rejected) {
    console.error(`- ${license}: ${packages.map((item) => `${item.name}@${item.version}`).join(", ")}`);
  }
  process.exit(1);
}

const packageCount = Object.values(licenses).reduce((total, packages) => total + packages.length, 0);
console.log(
  `라이선스 검사 통과: 프로덕션 의존성 ${packageCount}개, ${Object.keys(licenses).length}개 라이선스 유형`,
);
