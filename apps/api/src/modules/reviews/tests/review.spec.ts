import { Review, ReviewEligibility } from "../domain/review";

describe("Reviews (S29)", () => {
  it("ratings are 1-5 integers; self-review refused", () => {
    expect(() => new Review("r1", "o1", "u1", "u2", { quality: 0, punctuality: 3, communication: 4 })).toThrow(/1-5/);
    expect(() => new Review("r1", "o1", "u1", "u1", { quality: 3, punctuality: 3, communication: 3 })).toThrow(/yourself/);
  });
  it("only COMPLETED work is reviewable; duplicates refused", () => {
    const elig = new ReviewEligibility(new Set(["order_done_1"]));
    expect(elig.isEligible("order_open_2", "u1", "u2").eligible).toBe(false);
    const ok = elig.isEligible("order_done_1", "u1", "u2");
    expect(ok.eligible).toBe(true);
    elig.markReviewed("order_done_1", "u1", "u2");
    expect(elig.isEligible("order_done_1", "u1", "u2").eligible).toBe(false);
  });
  it("moderation can hide/remove; averages round to one decimal", () => {
    const r = new Review("r1", "o1", "u1", "u2", { quality: 5, punctuality: 4, communication: 4 });
    expect(r.average()).toBe(4.3);
    r.hide();
    expect(r.isVisible()).toBe(false);
  });
});