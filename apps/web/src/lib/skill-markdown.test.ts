import { describe, expect, it } from "vitest";
import { stripSkillFrontmatter } from "./skill-markdown.js";

describe("stripSkillFrontmatter", () => {
  it("removes YAML metadata and keeps the rendered instructions", () => {
    expect(stripSkillFrontmatter("---\nname: review\ndescription: Review code\n---\n\n# Review\n\nCheck changes.")).toBe("# Review\n\nCheck changes.");
  });

  it("leaves plain Markdown unchanged", () => {
    expect(stripSkillFrontmatter("# Review\n")).toBe("# Review\n");
  });
});
