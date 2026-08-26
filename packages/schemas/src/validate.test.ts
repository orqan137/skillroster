import { describe, expect, it } from "vitest";
import { API_VERSION, DocumentValidationError, validateDocument } from "./index.js";

describe("validateDocument", () => {
  it("accepts a valid team document", () => {
    const document = {
      apiVersion: API_VERSION,
      kind: "Team",
      metadata: { name: "backend" },
      spec: {
        displayName: "Backend",
        defaultBranch: "main",
        owners: ["hong"],
        createdAt: "2026-08-25T00:00:00.000Z",
      },
    };
    expect(() => validateDocument(document)).not.toThrow();
  });

  it("rejects an invalid slug", () => {
    const document = {
      apiVersion: API_VERSION,
      kind: "Team",
      metadata: { name: "Backend Team" },
      spec: {
        displayName: "Backend",
        defaultBranch: "main",
        owners: ["hong"],
        createdAt: "2026-08-25T00:00:00.000Z",
      },
    };
    expect(() => validateDocument(document)).toThrow(DocumentValidationError);
  });
});
