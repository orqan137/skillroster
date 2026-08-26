import { describe, expect, it } from "vitest";
import { toSlug, toSlugDraft } from "./slug";

describe("slug input", () => {
  it("keeps a trailing separator while the user is still typing", () => {
    expect(toSlugDraft("notification-")).toBe("notification-");
    expect(toSlugDraft("notification-center")).toBe("notification-center");
  });

  it("normalizes the final identifier before saving", () => {
    expect(toSlug(" Notification--Center! ")).toBe("notification-center");
  });
});
