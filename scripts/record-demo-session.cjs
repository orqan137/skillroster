const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright-core");

const root = path.resolve(__dirname, "..");
const managerUrl = process.env.SKILLROSTER_MANAGER_URL || "http://127.0.0.1:3214";
const memberUrl = process.env.SKILLROSTER_MEMBER_URL || "http://127.0.0.1:3215";
const demoUrl = process.env.SKILLROSTER_DEMO_URL || "http://127.0.0.1:3213";
const remoteUrl = process.env.SKILLROSTER_LIVE_REMOTE || "https://github.com/orqan137/skillroster-test2.git";
const remoteWebUrl = remoteUrl.replace(/\.git$/, "");
const projectRemoteUrl = process.env.SKILLROSTER_PROJECT_REMOTE || "https://github.com/orqan137/skillroster-project-test.git";
const projectRemoteWebUrl = projectRemoteUrl.replace(/\.git$/, "");
const resumeAfterCreate = process.env.SKILLROSTER_RESUME_AFTER_CREATE === "1";
const resumeAfterManager = process.env.SKILLROSTER_RESUME_AFTER_MANAGER === "1";
const demoOnly = process.env.SKILLROSTER_DEMO_ONLY === "1";
const outputDir = path.resolve(root, process.argv[2] || "artifacts/video/recording");
const edgePath = process.env.EDGE_PATH || "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const installPath = process.env.SKILLROSTER_RECORDING_PROJECT || "C:\\Users\\castle\\AppData\\Local\\Temp\\skillroster-recording-project-live";
const shareableFile = process.env.SKILLROSTER_SHAREABLE_FILE || path.join(root, "examples", "skills", "api-contract-check", "CHECKLIST.md");

const videoRoot = path.join(root, "artifacts", "video");
const relativeOutput = path.relative(videoRoot, outputDir);
if (relativeOutput.startsWith("..") || path.isAbsolute(relativeOutput)) {
  throw new Error("녹화 경로는 artifacts/video 아래여야 함");
}
fs.rmSync(outputDir, { recursive: true, force: true });
fs.mkdirSync(outputDir, { recursive: true });

const overlayScript = () => {
  const ensure = () => {
    if (document.querySelector("[data-demo-overlay]")) return;
    const style = document.createElement("style");
    style.textContent = `
      [data-demo-cursor] { position: fixed; z-index: 2147483647; width: 22px; height: 22px; border: 3px solid #0057ff; border-radius: 50%; background: rgba(255,255,255,.92); transform: translate(-50%,-50%); pointer-events: none; box-shadow: 0 2px 0 #07120d; transition: width .12s, height .12s, background .12s; }
      [data-demo-cursor].down { width: 38px; height: 38px; background: rgba(0,230,132,.7); }
      [data-demo-agenda] { position: fixed; z-index: 2147483645; top: 132px; left: 50%; width: 850px; transform: translateX(-50%); box-sizing: border-box; padding: 42px 52px 44px; color: #fff; background: #07120d; border-top: 8px solid #00e684; box-shadow: 12px 12px 0 #0057ff; font-family: Pretendard, "Malgun Gothic", sans-serif; pointer-events: none; }
      [data-demo-agenda][hidden] { display: none; }
      [data-demo-agenda] > span { color: #00e684; font-size: 18px; font-weight: 800; letter-spacing: .08em; }
      [data-demo-agenda] h2 { margin: 10px 0 28px; font-size: 46px; line-height: 1.2; }
      [data-demo-agenda] p { margin: 0 0 25px; color: #c7d4cc; font-size: 22px; }
      [data-demo-agenda] ol { display: grid; grid-template-columns: 1fr 1fr; gap: 15px 30px; margin: 0; padding: 0; list-style: none; }
      [data-demo-agenda] li { padding: 15px 0; border-top: 1px solid #526057; font-size: 25px; font-weight: 750; }
      [data-demo-agenda] b { margin-right: 12px; color: #00e684; }
      [data-demo-highlight] { position: relative; outline: 5px solid #0057ff; outline-offset: 8px; background: #fff; }
      [data-demo-highlight-label] { position: absolute; z-index: 2147483647; right: 0; bottom: calc(100% + 12px); padding: 9px 13px; color: #fff; background: #0057ff; border: 2px solid #07120d; font: 800 16px Pretendard, "Malgun Gothic", sans-serif; white-space: nowrap; pointer-events: none; }
    `;
    document.head.append(style);
    const cursor = document.createElement("div");
    cursor.dataset.demoCursor = "";
    cursor.style.left = "120px";
    cursor.style.top = "120px";
    const agenda = document.createElement("section");
    agenda.dataset.demoAgenda = "";
    agenda.hidden = true;
    agenda.innerHTML = '<span>SKILLROSTER DEMO</span><h2>시연 순서</h2><p>실제 GitHub 연동과 더미 데이터로 주요 기능 시연</p><ol><li><b>01</b>빈 GitHub 확인</li><li><b>02</b>새 로스터 생성</li><li><b>03</b>팀원 연결</li><li><b>04</b>스킬 공유·평가</li><li><b>05</b>프로젝트 Git 연결</li><li><b>06</b>OpenCode 설치</li><li><b>07</b>팀원·설정</li></ol>';
    document.body.append(cursor, agenda);
    document.addEventListener("mousemove", (event) => {
      cursor.style.left = `${event.clientX}px`;
      cursor.style.top = `${event.clientY}px`;
    });
    document.addEventListener("mousedown", () => cursor.classList.add("down"));
    document.addEventListener("mouseup", () => setTimeout(() => cursor.classList.remove("down"), 120));
    setInterval(() => {
      cursor.style.opacity = cursor.style.opacity === "0.99" ? "1" : "0.99";
    }, 100);
    window.__showDemoAgenda = (visible) => { agenda.hidden = !visible; };
    window.__highlightDemoField = (selector, text) => {
      const field = document.querySelector(selector);
      const target = field?.closest("label") ?? field;
      if (!target) return;
      target.dataset.demoHighlight = "";
      const label = document.createElement("span");
      label.dataset.demoHighlightLabel = "";
      label.textContent = text;
      target.append(label);
    };
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ensure);
  else ensure();
};

async function main() {
  const browser = await chromium.launch({ executablePath: edgePath, headless: true });
  const context = await browser.newContext({
    // The browser occupies only the upper 960 px of the final 1080p frame.
    // Captions are rendered later into a dedicated 120 px strip so they can
    // never cover buttons, fields, or other application content.
    viewport: { width: 1920, height: 960 },
    deviceScaleFactor: 1,
    locale: "ko-KR",
    colorScheme: "light",
  });
  await context.addInitScript(overlayScript);
  const page = await context.newPage();
  await page.goto(demoOnly ? demoUrl : managerUrl);
  if (demoOnly) {
    await page.getByRole("heading", { name: "Platform Team", level: 1 }).waitFor();
  } else if (resumeAfterCreate) {
    await page.getByRole("heading", { name: "스킬 폴더 선택" }).waitFor();
  } else if (resumeAfterManager) {
    await page.getByRole("heading", { name: "SkillRoster Test Team", level: 1 }).waitFor();
  } else {
    await page.getByRole("heading", { name: "로스터 시작하기" }).waitFor();
  }

  const client = await context.newCDPSession(page);
  const frames = [];
  const captions = [];
  let firstTimestamp;
  let frameIndex = 0;
  client.on("Page.screencastFrame", ({ data, metadata, sessionId }) => {
    if (firstTimestamp === undefined) firstTimestamp = metadata.timestamp;
    const file = `${String(frameIndex).padStart(5, "0")}.jpg`;
    fs.writeFileSync(path.join(outputDir, file), Buffer.from(data, "base64"));
    frames.push({ file, time: metadata.timestamp - firstTimestamp });
    frameIndex += 1;
    client.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
  });
  await client.send("Page.startScreencast", {
    format: "jpeg",
    quality: 74,
    maxWidth: 1920,
    maxHeight: 960,
    everyNthFrame: 1,
  });

  const startedAt = Date.now();
  const elapsed = () => (Date.now() - startedAt) / 1000;
  const minimumCaptionSeconds = 4.2;
  let activeCaption;
  const finishCaption = async () => {
    if (!activeCaption) return;
    const visibleFor = elapsed() - activeCaption.start;
    if (visibleFor < minimumCaptionSeconds) {
      await page.waitForTimeout((minimumCaptionSeconds - visibleFor) * 1000);
    }
    activeCaption.end = elapsed();
    captions.push(activeCaption);
    activeCaption = undefined;
  };
  const setCaption = async (step, text, progress) => {
    await finishCaption();
    const now = elapsed();
    activeCaption = { start: now, end: now, text: `[${step}] ${text}` };
  };
  const pause = (milliseconds = 450) => page.waitForTimeout(milliseconds);
  const click = async (locator, after = 420) => {
    await locator.scrollIntoViewIfNeeded();
    const box = await locator.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 14 });
      await page.waitForTimeout(120);
    }
    await locator.click();
    if (after) await pause(after);
  };
  const type = async (locator, value, delay = 38) => {
    await click(locator, 100);
    await locator.fill("");
    await locator.pressSequentially(value, { delay });
  };
  const goto = async (url, options) => {
    await finishCaption();
    return page.goto(url, options);
  };
  const nav = async (name) => {
    await finishCaption();
    return click(page.getByRole("link", { name, exact: true }));
  };
  const showFreshGitHub = async (url, expectedText) => {
    await finishCaption();
    const separator = url.includes("?") ? "&" : "?";
    await page.goto(`${url}${separator}demo_refresh=${Date.now()}`, {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });
    // An explicit reload makes the remote update visible in the recording and
    // prevents GitHub's previous empty-repository response from being reused.
    await page.reload({ waitUntil: "domcontentloaded", timeout: 45000 });
    await page
      .getByText(expectedText, { exact: false })
      .filter({ visible: true })
      .first()
      .waitFor({ timeout: 45000 });
  };

  if (!demoOnly && !resumeAfterCreate && !resumeAfterManager) {
    await setCaption("01", "빈 GitHub 저장소부터 프로젝트 적용까지 실제 화면으로 시연", 2);
    await page.evaluate(() => window.__showDemoAgenda?.(true));
    await page.mouse.move(680, 410, { steps: 18 });
    await pause(850);
    await page.mouse.move(1230, 610, { steps: 18 });
    await pause(700);
    await page.evaluate(() => window.__showDemoAgenda?.(false));

    await goto(remoteWebUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.locator("body").waitFor();
    await setCaption("01", "팀 로스터용 GitHub 저장소가 비어 있는 상태 확인", 7);
    await page.mouse.move(820, 420, { steps: 20 });
    await pause(850);

    await goto(managerUrl);
    await page.getByRole("heading", { name: "로스터 시작하기" }).waitFor();
    await setCaption("02", "팀장: 새 로스터 만들기 선택 후 팀과 관리자 정보 입력", 11);
    await click(page.getByRole("button", { name: /새 로스터 만들기/ }));
    await type(page.getByRole("textbox", { name: /팀 이름/ }), "SkillRoster Test Team");
    await type(page.getByRole("textbox", { name: "이름", exact: true }), "데모 팀장");
    await type(page.getByRole("textbox", { name: "이메일", exact: true }), "demo-lead@skillroster.dev", 24);
    await click(page.getByText("식별자 설정", { exact: true }), 180);
    await type(page.getByRole("textbox", { name: "팀 ID", exact: true }), "skillroster-test2", 24);
    await type(page.getByRole("textbox", { name: "관리자 ID", exact: true }), "demo-lead", 24);
    await click(page.getByRole("button", { name: "계속", exact: true }));

    await setCaption("02", "실제 공개 GitHub 주소 입력 · Git 인증은 운영체제 설정 사용", 18);
    await page.evaluate(() => window.__highlightDemoField?.('input[placeholder*="github.com"]', "실제 공개 GitHub 저장소"));
    await type(page.getByRole("textbox", { name: /원격 Git 주소/ }), remoteUrl, 22);
    await click(page.getByRole("button", { name: "계속", exact: true }), 0);
    await page.getByRole("heading", { name: "로스터 생성 확인" }).waitFor({ timeout: 30000 });

    await setCaption("02", "Git 권한 확인 후 팀 문서·JSON Schema 생성과 첫 커밋 push", 24);
    await click(page.getByRole("button", { name: "로스터 만들기" }), 0);
    await page.getByRole("heading", { name: "스킬 폴더 선택" }).waitFor({ timeout: 45000 });
  }

  if (!demoOnly && !resumeAfterManager) {
    await setCaption("02", "로컬 스킬 폴더 연결은 선택 사항 · 데모에서는 건너뛰기", 28);
    await click(page.getByRole("button", { name: "건너뛰기" }), 0);
    await page.getByRole("heading", { name: "SkillRoster Test Team", level: 1 }).waitFor({ timeout: 30000 });
    await showFreshGitHub(remoteWebUrl, "skillspace.yaml");
    await setCaption("02", "GitHub 새로고침 후 로스터 구조와 첫 커밋 반영 확인", 32);
    await page.mouse.move(860, 440, { steps: 22 });
    await pause(850);
  }

  if (!demoOnly) {
    await goto(memberUrl);
    await page.getByRole("heading", { name: "로스터 시작하기" }).waitFor();
    await setCaption("03", "팀원: 로스터 연결하기 선택 후 같은 Git 저장소 입력", 36);
    await click(page.getByRole("button", { name: /로스터 연결하기/ }));
    await type(page.getByRole("textbox", { name: /원격 Git 주소/ }), remoteUrl, 22);
    await click(page.getByRole("button", { name: "계속", exact: true }), 0);
    await page.getByRole("heading", { name: "사용자 정보", level: 2 }).waitFor({ timeout: 30000 });
    await type(page.locator('input[autocomplete="name"]'), "데모 팀원");
    await type(page.locator('input[autocomplete="email"]'), "demo-member@skillroster.dev", 22);
    await click(page.getByText("식별자 설정", { exact: true }), 180);
    await type(page.getByRole("textbox", { name: "사용자 ID", exact: true }), "demo-member", 24);
    await click(page.getByRole("button", { name: "계속", exact: true }));
    await page.getByRole("heading", { name: "로스터 연결 확인" }).waitFor();

    await setCaption("03", "clone과 형식 확인 후 팀원 문서를 커밋하고 push", 43);
    await click(page.getByRole("button", { name: "로스터 연결하기" }), 0);
    await page.getByRole("heading", { name: "스킬 폴더 선택" }).waitFor({ timeout: 45000 });
    await click(page.getByRole("button", { name: "건너뛰기" }), 0);
    await page.getByRole("heading", { name: "SkillRoster Test Team", level: 1 }).waitFor({ timeout: 45000 });

    await showFreshGitHub(remoteWebUrl, "chore(member): add demo-member");
    await setCaption("03", "GitHub 새로고침 후 팀장 초기화와 팀원 등록 커밋 확인", 48);
    await page.mouse.move(810, 520, { steps: 22 });
    await page.mouse.wheel(0, 280);
    await pause(750);
  }

  await goto(demoUrl);
  await page.getByRole("heading", { name: "Platform Team", level: 1 }).waitFor();
  await setCaption("04", "이후 화면은 더미 데이터 사용 · 평가 순위와 프로젝트 현황", 52);
  await page.mouse.move(1100, 470, { steps: 20 });
  await pause(700);

  await nav("스킬");
  await page.getByRole("heading", { name: "스킬", level: 1 }).waitFor();
  await setCaption("04", "팀 공유 스킬과 로컬 스킬 검색 · 공유 여부 구분", 57);
  const search = page.getByRole("textbox", { name: "스킬 검색" });
  await type(search, "api");
  await search.fill("");
  await click(page.getByRole("tab", { name: /내 로컬 스킬/ }), 350);
  await click(page.getByRole("tab", { name: /팀 공유 스킬/ }), 250);

  await setCaption("04", "새 SKILL.md 작성 · 참고 자료는 위치만 기록하거나 파일 포함 선택", 62);
  await click(page.getByRole("button", { name: "스킬 추가" }));
  await type(page.getByRole("textbox", { name: "스킬 이름" }), "release-check", 20);
  await type(page.getByRole("textbox", { name: "한 줄 설명" }), "배포 전 변경 사항과 위험 요소 점검", 24);
  await type(page.getByRole("textbox", { name: "에이전트가 따를 사용 방법" }), "변경 파일과 테스트 결과를 확인하고 배포 위험을 순서대로 정리합니다.", 16);
  await page.getByRole("combobox", { name: "내 로컬 저장소" }).selectOption({ index: 1 });
  await type(page.getByPlaceholder("backend, react, review"), "release, review", 18);
  await click(page.getByRole("button", { name: "각각 추가" }));
  await type(page.getByLabel("참고 자료 1 이름"), "배포 가이드", 18);
  await type(page.getByLabel("참고 자료 1 위치"), "https://docs.example.com/release", 12);
  await click(page.getByRole("button", { name: "추가", exact: true }));
  await type(page.getByLabel("참고 자료 2 이름"), "공유 체크리스트", 18);
  // Absolute Windows paths are filled atomically. Fast key simulation can
  // outpace React's controlled input updates and leave a truncated path.
  await page.getByLabel("참고 자료 2 위치").fill(shareableFile);
  await click(page.getByRole("button", { name: "위치만" }).nth(1));
  await click(page.getByRole("button", { name: "작성자 평가 함께 남기기" }));
  await click(page.getByRole("button", { name: "작성자 평가 5점" }));
  await type(page.getByPlaceholder("직접 사용한 범위, 장점과 주의점 기록"), "릴리스 점검 순서를 반복해서 확인하기 좋았음.", 18);
  await click(page.getByRole("button", { name: "스킬 만들고 공유" }), 0);
  await page.locator(".detail-header h1").filter({ hasText: "release-check" }).waitFor({ timeout: 30000 });
  await page.getByText("파일 포함", { exact: true }).waitFor();

  await goto(`${demoUrl}/skills/minjun/api-contract-check`);
  await page.locator(".detail-header h1").filter({ hasText: "api-contract-check" }).waitFor();
  await setCaption("04", "작성자와 동료 모두 평가 가능 · 후기와 프로젝트 기준을 Git에 기록", 70);
  await click(page.getByRole("button", { name: "5점" }), 180);
  await page.getByRole("combobox", { name: "프로젝트 기준" }).selectOption({ label: "Checkout API" });
  await type(page.getByRole("textbox", { name: "평가 의견" }), "계약 변경을 배포 전에 확인하기 좋았음.", 24);
  await click(page.getByRole("button", { name: "평가 저장" }), 0);
  await page.getByText("평가 저장 완료").waitFor({ timeout: 30000 });

  await goto(projectRemoteWebUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
  await setCaption("05", "프로젝트용 GitHub 저장소도 빈 상태에서 시작", 74);
  await page.mouse.move(830, 430, { steps: 20 });
  await pause(700);

  await goto(`${demoUrl}/projects`);
  await page.getByRole("heading", { name: "프로젝트", level: 1 }).waitFor();
  await click(page.getByRole("button", { name: "프로젝트 추가" }));
  await setCaption("05", "프로젝트 이름·Git 주소·기술 태그 입력 후 평가 순위 기반 스킬 선택", 79);
  await type(page.getByRole("textbox", { name: "프로젝트 이름", exact: true }), "고객 알림 센터");
  await type(page.getByRole("textbox", { name: /프로젝트 ID/ }), "notification-center", 20);
  await type(page.getByRole("textbox", { name: "프로젝트 Git 주소" }), projectRemoteUrl, 14);
  await type(page.getByPlaceholder("react, spring, docker"), "react, typescript", 18);
  await click(page.getByRole("button", { name: "각각 추가" }));
  await click(page.locator(".skill-recommend-picker > button").filter({ hasText: "api-contract-check" }));
  await click(page.locator(".skill-recommend-picker > button").filter({ hasText: "release-check" }));
  await click(page.getByRole("button", { name: /프로젝트 만들기/ }), 0);
  await page.getByRole("heading", { name: "고객 알림 센터", level: 1 }).waitFor({ timeout: 45000 });

  await setCaption("05", "팀 레지스트리와 프로젝트 Git에 선택한 스킬 ID·버전 동시 반영", 86);
  await page.mouse.move(1080, 300, { steps: 18 });
  await pause(650);
  await showFreshGitHub(projectRemoteWebUrl, ".skillroster");
  await setCaption("05", "GitHub 새로고침 후 .skillroster/project.yaml 반영 확인", 89);
  await page.mouse.move(830, 480, { steps: 20 });
  await pause(750);

  await goto(`${demoUrl}/projects/notification-center`);
  await page.getByRole("heading", { name: "고객 알림 센터", level: 1 }).waitFor();
  await click(page.getByRole("tab", { name: /연결된 스킬/ }), 250);
  await setCaption("06", "프로젝트 구성을 실제 .opencode/skills 폴더에 설치", 91);
  fs.mkdirSync(installPath, { recursive: true });
  await type(page.getByRole("textbox", { name: "로컬 프로젝트 폴더" }), installPath, 8);
  await click(page.getByRole("button", { name: "선택한 스킬 설치" }), 0);
  await page.getByRole("status").filter({ hasText: "스킬 설치 완료" }).waitFor({ timeout: 15000 });

  await nav("팀원");
  await page.getByRole("heading", { name: "팀원", level: 1 }).waitFor();
  await setCaption("07", "팀원별 공유 스킬·평가·생성 프로젝트 수 확인", 95);
  await page.mouse.move(930, 510, { steps: 20 });
  await pause(550);

  await nav("설정");
  await page.getByRole("heading", { name: "Platform Team 설정", level: 1 }).waitFor();
  await setCaption("07", "로스터별 Git 연결·사용자 정보·로컬 저장 경로 관리", 98);
  await click(page.getByRole("button", { name: "수정" }).first(), 300);
  await click(page.getByRole("button", { name: "취소" }), 180);

  await nav("개요");
  await page.getByRole("heading", { name: "Platform Team", level: 1 }).waitFor();
  await setCaption("07", "개요에서 평가 순위와 프로젝트 구성 다시 확인", 100);
  await page.mouse.move(1090, 480, { steps: 20 });
  await pause(5000);

  await finishCaption();
  await client.send("Page.stopScreencast");
  await pause(350);
  const duration = elapsed();
  fs.writeFileSync(
    path.join(outputDir, "manifest.json"),
    JSON.stringify({ duration, frames, captions, remoteUrl, projectRemoteUrl, numberedStages: true }, null, 2),
  );
  await browser.close();
  process.stdout.write(`${frames.length} frames\n${duration.toFixed(2)} seconds\n${outputDir}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
