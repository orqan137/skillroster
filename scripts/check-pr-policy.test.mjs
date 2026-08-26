import test from "node:test";
import assert from "node:assert/strict";
import { validatePullRequest } from "./check-pr-policy.mjs";

test("accepts an Issue-linked feature PR", () => {
  assert.deepEqual(
    validatePullRequest({
      actor: "contributor",
      body: "## 연결된 Issue\n\nCloses #123",
      branch: "feat/#123-local-demo",
      title: "feat(cli): add local demo",
    }),
    [],
  );
});

test("rejects a branch without an Issue number", () => {
  assert.match(
    validatePullRequest({ branch: "feat/local-demo", title: "feat: add demo", body: "Closes #123" })[0],
    /branch/,
  );
});

test("requires the body to link the same Issue as the branch", () => {
  assert.match(
    validatePullRequest({ branch: "fix/#12-parser", title: "fix: parse tags", body: "Closes #13" })[0],
    /#12/,
  );
});

test("allows Dependabot's managed branch format", () => {
  assert.deepEqual(
    validatePullRequest({ actor: "dependabot[bot]", branch: "dependabot/npm/react-20", title: "Bump react" }),
    [],
  );
});
