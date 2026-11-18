import { ProjectGraph } from "../domain/project-graph";

function construction(): ProjectGraph {
  return new ProjectGraph()
    .addService("architecture")
    .addService("engineering", ["architecture"])
    .addService("construction", ["engineering"])
    .addService("electrical", ["construction"])
    .addService("furniture", ["construction"]);
}

describe("ProjectGraph (S27/S65)", () => {
  it("blocks downstream until upstream REALLY completes", () => {
    const g = construction();
    g.setOrder("architecture", "in_progress");
    expect(g.readiness("engineering")).toBe("blocked");
    g.setOrder("architecture", "completed");
    expect(g.readiness("engineering")).toBe("unblocked");
    expect(g.readiness("construction")).toBe("blocked");
  });
  it("delay ripples to dependents, not to siblings", () => {
    const g = construction();
    expect(g.downstreamAffected("engineering").sort()).toEqual(["construction", "electrical", "furniture"]);
    expect(g.downstreamAffected("electrical")).toEqual([]);
  });
  it("cycles are impossible by construction (domain) - SQL layer adds a second check (fix #4)", () => {
    const g = new ProjectGraph().addService("a");
    expect(() => g.addService("b", ["b"])).toThrow(/dependency must already exist/);
  });
});