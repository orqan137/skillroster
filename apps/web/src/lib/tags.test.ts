import { describe, expect, it } from "vitest";
import { mergeTags, parseTags } from "./tags.js";

describe("tag input", () => {
  it("splits comma, whitespace and newline separated tags into individual slugs", () => {
    expect(parseTags("React, spring  Spring-Boot\ndocker")).toEqual(["react", "spring", "spring-boot", "docker"]);
  });

  it("merges tags without duplicates", () => {
    expect(mergeTags(["react"], "react, spring")).toEqual(["react", "spring"]);
  });
});
