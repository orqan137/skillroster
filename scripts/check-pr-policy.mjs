import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const CHANGE_TYPES = "feat|fix|docs|refactor|test|build|ci|chore|perf|style";
const BRANCH_PATTERN = new RegExp(`^(${CHANGE_TYPES})/#([0-9]+)-[a-z0-9][a-z0-9-]*$`);
const TITLE_PATTERN = new RegExp(`^(${CHANGE_TYPES})(\\([a-z0-9._-]+\\))?!?: .+`);

export function validatePullRequest({ actor = "", body = "", branch = "", title = "" }) {
  if (actor === "dependabot[bot]") return [];

  const errors = [];
  const branchMatch = branch.match(BRANCH_PATTERN);
  if (!branchMatch) {
    errors.push("branch는 type/#issue-short-description 형식이어야 함 (예: feat/#123-local-demo)");
  }
  if (!TITLE_PATTERN.test(title)) {
    errors.push("PR 제목은 Conventional Commit 형식이어야 함 (예: feat(cli): add local demo)");
  }
  if (branchMatch) {
    const issue = branchMatch[2];
    const issueLink = new RegExp(`(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?|refs?)\\s+#${issue}(?:\\D|$)`, "i");
    if (!issueLink.test(body)) {
      errors.push(`PR 본문에 branch와 같은 Issue를 연결해야 함 (Closes #${issue} 또는 Refs #${issue})`);
    }
  }
  return errors;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const errors = validatePullRequest({
    actor: process.env.PR_ACTOR,
    body: process.env.PR_BODY,
    branch: process.env.PR_BRANCH,
    title: process.env.PR_TITLE,
  });

  if (errors.length > 0) {
    console.error("PR policy 위반:");
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
  } else {
    console.log("PR policy 통과: Issue, branch, title 연결 확인");
  }
}
