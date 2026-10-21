import { describe, expect, it } from "vitest";
import { adaptiveRoute, examPhase, numericEqual, numericRational, validExamCommand, EMPTY_EXAM_ANSWER } from "./exam";
describe("adaptive exam rules", () => {
  it("routes using scored items, including blanks, at the integer boundary", () => {
    expect(adaptiveRoute(16,25)).toBe("lower"); expect(adaptiveRoute(17,25)).toBe("higher");
    expect(adaptiveRoute(12,20)).toBe("lower"); expect(adaptiveRoute(13,20)).toBe("higher");
    expect(() => adaptiveRoute(0,0)).toThrow();
  });
  it("uses continuous deadlines through break and suspended tabs", () => {
    expect(examPhase(1000,1920999)).toBe("rw1"); expect(examPhase(1000,1921000)).toBe("rw2");
    expect(examPhase(0,3840000)).toBe("break"); expect(examPhase(0,4440000)).toBe("math1");
    expect(examPhase(0,6540000)).toBe("math2"); expect(examPhase(0,8640000)).toBe("completed");
  });
  it("compares exact fractions, signs and explicit rounded representations", () => {
    expect(numericEqual(".5",["1/2"])).toBe(true); expect(numericEqual("-0.5",["-1/2"])).toBe(true);
    expect(numericEqual(".3333",["1/3"])).toBe(false); expect(numericEqual(".3333",["1/3",".3333"])).toBe(true);
    expect(numericEqual("-0",["0"])).toBe(true);
  });
  it.each(["", "1/0", "1,5", "50%", "$10", "1 1/2", "1e3", "123456", "-123456", "2+2", ".", "NaN"])("rejects invalid SPR %s", v => expect(numericRational(v)).toBeNull());
  it("bounds annotation, answer and calculator payloads", () => {
    const cmd = {operation:"save",requestId:"00000000-0000-4000-8000-000000000001",attemptId:"00000000-0000-4000-8000-000000000002",questionId:"00000000-0000-4000-8000-000000000003",expectedRevision:0,answer:EMPTY_EXAM_ANSWER};
    expect(validExamCommand(cmd)).toBe(true);
    expect(validExamCommand({...cmd,answer:{...EMPTY_EXAM_ANSWER,observedMs:-1}})).toBe(false);
    expect(validExamCommand({...cmd,answer:{...EMPTY_EXAM_ANSWER,annotations:[{blockId:"x",start:2,end:1,style:"highlight"}]}})).toBe(false);
    expect(validExamCommand({...cmd,operation:"calculator",calculator:{graphing:"x".repeat(100001)}})).toBe(false);
  });
});
