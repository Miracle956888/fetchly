import { describe, expect, it } from "vitest";
import { scoreQuiz, type ScoreableQuestion, type ScoreableAnswer } from "@/services/quiz.service";

const questions: ScoreableQuestion[] = [
  { id: "q1", points: 1, correctOptionId: "a" },
  { id: "q2", points: 1, correctOptionId: "b" },
  { id: "q3", points: 2, correctOptionId: "c" },
];

describe("scoreQuiz", () => {
  it("scores all correct", () => {
    const answers: ScoreableAnswer[] = [
      { questionId: "q1", optionId: "a" },
      { questionId: "q2", optionId: "b" },
      { questionId: "q3", optionId: "c" },
    ];
    const r = scoreQuiz(questions, answers);
    expect(r.totalPoints).toBe(4);
    expect(r.scorePoints).toBe(4);
    expect(r.percent).toBe(100);
    expect(r.perQuestion).toEqual({ q1: true, q2: true, q3: true });
  });

  it("scores all wrong", () => {
    const answers: ScoreableAnswer[] = [
      { questionId: "q1", optionId: "z" },
      { questionId: "q2", optionId: "z" },
      { questionId: "q3", optionId: "z" },
    ];
    const r = scoreQuiz(questions, answers);
    expect(r.scorePoints).toBe(0);
    expect(r.percent).toBe(0);
    expect(r.perQuestion).toEqual({ q1: false, q2: false, q3: false });
  });

  it("respects per-question point weighting", () => {
    // q3 is worth 2 points; getting only q1+q2 right = 2/4 = 50%
    const answers: ScoreableAnswer[] = [
      { questionId: "q1", optionId: "a" },
      { questionId: "q2", optionId: "b" },
      { questionId: "q3", optionId: "z" },
    ];
    const r = scoreQuiz(questions, answers);
    expect(r.scorePoints).toBe(2);
    expect(r.percent).toBe(50);
  });

  it("treats unanswered questions as wrong", () => {
    const answers: ScoreableAnswer[] = [{ questionId: "q1", optionId: "a" }];
    const r = scoreQuiz(questions, answers);
    expect(r.scorePoints).toBe(1);
    expect(r.percent).toBe(25);
    expect(r.perQuestion.q2).toBe(false);
    expect(r.perQuestion.q3).toBe(false);
  });

  it("is defensive against unknown question/answer ids", () => {
    const answers: ScoreableAnswer[] = [
      { questionId: "q1", optionId: "a" },
      { questionId: "ghost", optionId: "a" }, // unknown question
    ];
    const r = scoreQuiz(questions, answers);
    expect(r.scorePoints).toBe(1);
    expect("ghost" in r.perQuestion).toBe(false);
  });

  it("handles an empty question set without dividing by zero", () => {
    const r = scoreQuiz([], []);
    expect(r.totalPoints).toBe(0);
    expect(r.percent).toBe(0);
  });
});
