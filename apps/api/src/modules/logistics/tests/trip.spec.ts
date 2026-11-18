import { Trip, Stop } from "../domain/trip";

describe("Logistics (S42)", () => {
  it("trip lifecycle with explicit transitions", () => {
    const t = new Trip("t1", "org1", "veh1", "w1");
    t.dispatch(); t.start(); t.complete();
    expect(t.status).toBe("completed");
  });
  it("cannot complete without transit", () => {
    const t = new Trip("t1", "org1", "veh1", "w1");
    expect(() => t.complete()).toThrow(/illegal/);
  });
  it("proof of delivery is mandatory; confirmation requires it", () => {
    const s = new Stop("s1", "t1", "o1", "Kigali");
    s.arrive(); s.load();
    expect(() => s.deliver("")).toThrow(/PROOF/);
    s.deliver("photo_ref_123");
    s.confirm();
    expect(s.status).toBe("confirmed");
  });
  it("failed delivery requires a reason and reschedules to pending", () => {
    const s = new Stop("s1", "t1", "o1", "Kigali");
    s.arrive();
    expect(() => s.fail("")).toThrow(/reason/);
    s.fail("customer absent");
    s.reschedule();
    expect(s.status).toBe("pending");
  });
});