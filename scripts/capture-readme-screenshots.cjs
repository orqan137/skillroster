const path = require("node:path");
const { chromium } = require("playwright-core");

const root = path.resolve(__dirname, "..");
const output = path.join(root, "docs", "images", "screenshots");
const setupUrl = process.env.SKILLROSTER_SETUP_URL || "http://127.0.0.1:3212";
const demoUrl = process.env.SKILLROSTER_DEMO_URL || "http://127.0.0.1:3211";
const executablePath = process.env.SKILLROSTER_BROWSER || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const readyProject = process.env.SKILLROSTER_READY_PROJECT || "checkout-api";
const readyProjectName = process.env.SKILLROSTER_READY_PROJECT_NAME || "Checkout API";
const readyOnly = process.env.SKILLROSTER_CAPTURE_READY_ONLY === "1";

async function settle(page) {
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(180);
}

async function capture(page, name) {
  await settle(page);
  await page.screenshot({ path: path.join(output, name), fullPage: false });
}

(async () => {
  const browser = await chromium.launch({ executablePath, headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    locale: "ko-KR",
  });

  if (!readyOnly) {
    await page.goto(setupUrl);
    await page.getByRole("heading", { name: "로스터 시작하기" }).waitFor();
    await capture(page, "01-start.png");

    await page.goto(demoUrl);
    await page.getByRole("heading", { name: "Platform Team", level: 1 }).waitFor();
    await capture(page, "02-dashboard.png");

    await page.goto(`${demoUrl}/skills`);
    await page.getByRole("heading", { name: "스킬", level: 1 }).waitFor();
    await capture(page, "03-skills.png");

    await page.goto(`${demoUrl}/projects`);
    await page.getByRole("heading", { name: "프로젝트", level: 1 }).waitFor();
    await page.getByRole("button", { name: "프로젝트 추가" }).click();
    await page.getByRole("dialog", { name: "새 프로젝트 만들기" }).waitFor();
    await page.getByRole("textbox", { name: "프로젝트 이름", exact: true }).fill("고객 알림 센터");
    await page.getByRole("textbox", { name: /프로젝트 ID/ }).fill("notification-center");
    await page.getByRole("textbox", { name: "프로젝트 Git 주소" }).fill("https://github.com/example/notification-center");
    await page.getByPlaceholder("react, spring, docker").fill("react, typescript");
    await page.getByRole("button", { name: "각각 추가" }).click();
    await page.locator(".skill-recommend-picker > button").filter({ hasText: "api-contract-check" }).click();
    await page.locator(".skill-recommend-picker > button").filter({ hasText: "docker-debug" }).click();
    await capture(page, "04-project-create.png");
  }

  await page.goto(`${demoUrl}/projects/${readyProject}`);
  await page.getByRole("heading", { name: readyProjectName, level: 1 }).waitFor();
  await page.getByRole("tab", { name: /연결된 스킬/ }).click();
  await capture(page, "05-project-ready.png");

  await browser.close();
  process.stdout.write(`${output}\n`);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
