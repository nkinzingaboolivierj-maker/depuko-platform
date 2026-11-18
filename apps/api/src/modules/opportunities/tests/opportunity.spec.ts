import { Opportunity, Application } from "../domain/opportunity";

describe("Opportunities (S25)", () => {
  const opp = new Opportunity("op1", "org1", "Groomer", ["pet_grooming"], "Kigali", "onsite", 300000, 90);
  it("opportunity lifecycle; skills required", () => {
    opp.publish();
    expect(opp.status).toBe("published");
    expect(() => new Opportunity("op2", "org1", "X", [], "Kigali", "onsite", 1, 1)).toThrow(/skills/);
    opp.close();
    expect(() => opp.publish()).toThrow(/draft/);
  });
  it("applications snapshot + one-stage-at-a-time", () => {
    const a = new Application("a1", "op1", "w1", { verifiedSkills: ["pet_grooming"], headline: "Groomer, 3y" });
    expect(() => a.advance("assessment")).toThrow(/one stage/);
    a.advance("screening"); a.advance("shortlisted"); a.advance("interviewing"); a.advance("assessment"); a.advance("selected");
    expect(a.stage).toBe("selected");
    expect(() => a.reject()).toThrow(/silently/);
  });
  it("withdrawal before selection is free; snapshot is immutable", () => {
    const a = new Application("a1", "op1", "w1", { verifiedSkills: ["cleaning"], headline: "Cleaner" });
    a.withdraw();
    expect(a.stage).toBe("withdrawn");
    expect(a.snapshot.verifiedSkills).toEqual(["cleaning"]);
  });
});