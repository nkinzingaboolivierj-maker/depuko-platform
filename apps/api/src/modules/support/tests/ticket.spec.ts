import { Ticket } from "../domain/ticket";

describe("Support (S32)", () => {
  it("internal notes are NEVER in the customer view", () => {
    const t = new Ticket("tk1", "cust1", "payments");
    t.reply("staff1", "We are on it", true);
    t.addInternalNote("staff1", "customer has a duplicate webhook issue - check provider");
    const view = t.customerView() as { messages: { body: string }[] };
    expect(view.messages).toHaveLength(1);
    expect(JSON.stringify(view)).not.toContain("duplicate webhook");
  });
  it("lifecycle with reopen; escalation flags", () => {
    const t = new Ticket("tk1", "cust1", "payments", "urgent");
    t.start(); t.escalate();
    expect(t.escalated).toBe(true);
    t.resolve(); t.reopen();
    expect(t.status).toBe("reopened");
    t.resolve(); t.close();
    expect(t.status).toBe("closed");
  });
  it("empty replies rejected", () => {
    const t = new Ticket("tk1", "cust1", "general");
    expect(() => t.reply("staff1", "  ", true)).toThrow(/empty/);
  });
});