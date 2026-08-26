const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const recording = path.resolve(
  root,
  process.env.SKILLROSTER_RECORDING_DIR || "artifacts/video/recording",
);
const videoRoot = path.join(root, "artifacts", "video");
const relativeRecording = path.relative(videoRoot, recording);
if (relativeRecording.startsWith("..") || path.isAbsolute(relativeRecording)) {
  throw new Error("녹화 경로는 artifacts/video 아래여야 함");
}
const manifestPath = path.join(recording, "manifest.json");

if (!fs.existsSync(manifestPath)) {
  throw new Error("녹화 manifest 없음. record-demo-session.cjs를 먼저 실행하세요.");
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
if (!manifest.numberedStages) throw new Error("번호형 단계 자막이 없는 녹화입니다.");
if (!manifest.remoteUrl || !manifest.projectRemoteUrl) throw new Error("팀·프로젝트 GitHub 주소가 manifest에 없습니다.");
if (!Array.isArray(manifest.frames) || manifest.frames.length < 100) throw new Error("녹화 프레임이 부족합니다.");

const stages = new Set((manifest.captions ?? []).map((caption) => /^\[(\d{2})\]/.exec(caption.text)?.[1]).filter(Boolean));
for (const stage of ["01", "02", "03", "04", "05", "06", "07"]) {
  if (!stages.has(stage)) throw new Error(`${stage} 단계 자막이 없습니다.`);
}

process.stdout.write(`${manifest.frames.length} frames\n${Number(manifest.duration).toFixed(2)} seconds\n7 numbered stages\n${recording}\n`);
