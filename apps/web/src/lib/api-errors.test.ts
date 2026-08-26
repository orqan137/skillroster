import { describe, expect, it } from "vitest";
import { RegistryDataError } from "@skillspace/core";
import { RepositoryStateError } from "@skillspace/git";
import { ApiInputError, ApiNotFoundError, classifyApiError } from "./api-errors.js";

describe("API error classification", () => {
  it("returns actionable status codes without leaking unknown errors", () => {
    expect(classifyApiError(new RegistryDataError("bad registry", "skill.yaml"), "req-1")).toMatchObject({ status: 422, body: { code: "REGISTRY_DATA_INVALID" }, report: false });
    expect(classifyApiError(new RepositoryStateError("dirty"), "req-2")).toMatchObject({ status: 409, body: { code: "GIT_WORKTREE_DIRTY" } });
    expect(classifyApiError(new Error("token=secret-internal-value"), "req-3")).toMatchObject({ status: 500, body: { code: "INTERNAL_ERROR", requestId: "req-3" }, report: true });
    expect(classifyApiError(new Error("token=secret-internal-value"), "req-3").body.error).not.toContain("secret-internal-value");
    expect(classifyApiError(new ApiInputError("입력 오류"), "req-4")).toMatchObject({ status: 400, body: { code: "INVALID_INPUT", requestId: "req-4" } });
    expect(classifyApiError(new ApiNotFoundError("없음"), "req-5")).toMatchObject({ status: 404, body: { code: "NOT_FOUND", requestId: "req-5" } });
  });
});
