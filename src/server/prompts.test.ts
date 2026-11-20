import { describe, expect, it } from "vitest";
import { imageInput } from "./options";
import { levelFor, parseCheckReport } from "./prompts";

describe("parseCheckReport", () => {
  it("reads a fenced JSON answer", () => {
    const report = parseCheckReport(
      '```json\n{"score": 72.4, "strengths": ["clear"], "problems": [{"problem": "vague", "impact": "guesses"}], "improved": "Better"}\n```',
    );
    expect(report).toEqual({
      score: 72,
      strengths: ["clear"],
      problems: [{ problem: "vague", impact: "guesses" }],
      improved: "Better",
    });
  });

  it("refuses prose and malformed shapes", () => {
    expect(parseCheckReport("I think it is fine.")).toBeNull();
    expect(parseCheckReport('{"score": 50}')).toBeNull();
    expect(parseCheckReport('{"score": 500, "strengths": [], "problems": [], "improved": "x"}')).toBeNull();
  });
});

describe("levelFor", () => {
  it("maps scores to the four levels", () => {
    expect([10, 50, 75, 95].map(levelFor)).toEqual(["Weak", "Fair", "Good", "Excellent"]);
  });
});

describe("imageInput", () => {
  const valid = {
    description: "A lighthouse",
    style: "Cinematic",
    aspectRatio: "16:9",
    camera: "Low angle",
    lighting: "Golden hour",
    quality: ["Highly detailed"],
    negative: "",
  };
  it("accepts options from the lists", () => {
    expect(imageInput.safeParse(valid).success).toBe(true);
  });
  it("refuses anything else", () => {
    expect(imageInput.safeParse({ ...valid, style: "Vaporwave" }).success).toBe(false);
    expect(imageInput.safeParse({ ...valid, aspectRatio: "2:1" }).success).toBe(false);
    expect(imageInput.safeParse({ ...valid, quality: ["Blurry"] }).success).toBe(false);
    expect(imageInput.safeParse({ ...valid, negative: "x".repeat(301) }).success).toBe(false);
  });
});
