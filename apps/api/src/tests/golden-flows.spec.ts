/**
 * Golden E2E flows (domain level, jest-executable): cleaning-to-payout,
 * pet grooming from Kinyarwanda intent, house construction dependency
 * chain, new business type via configuration. Full HTTP + DB E2E requires
 * the deployed stack (see deployment guide) and is NOT EXECUTED here.
 */
import { Order } from "../modules/orders/domain/entities/order.entity";
import { Ledger, LedgerAccount } from "../modules/finance/domain/ledger";
import { ProjectGraph } from "../modules/projects/domain/project-graph";
import { AiGateway } from "../modules/ai/ai-gateway";
import { BusinessOnboardingSession } from "../modules/business-onboarding/domain/onboarding-session";
import { registerBusinessTemplate } from "../modules/business-onboarding/domain/templates";
import { rankWorkersForSkills } from "../modules/dispatch/domain/dispatch-policy";

describe("GOLDEN FLOWS", () => {
  it("1. hourly cleaning: order completes, ledger posts balanced payout", () => {
    const o = new Order("o1", "cust1", 15000, "sd_clean", "sv1");
    o.confirm(); o.start(); o.complete();
    expect(o.status).toBe("completed");
    const l = new Ledger().addAccount(new LedgerAccount("acc_cash", "asset")).addAccount(new LedgerAccount("acc_payable", "liability"));
    expect(l.post("payout_o1", [
      { accountId: "acc_payable", direction: "debit", amountCents: 12000 },
      { accountId: "acc_cash", direction: "credit", amountCents: 12000 },
    ])).toBe(true);
  });

  it("9. pet grooming: Kinyarwanda intent -> verified worker match -> order price", () => {
    const gw = new AiGateway("");
    const intent = gw.resolveIntent("Nshaka umuntu uza mu rugo kumogosha imbwa", { pet_grooming: ["imbwa", "groom"] });
    expect(intent?.capability).toBe("pet_grooming");
    const ranked = rankWorkersForSkills([
      { userId: "w1", skills: ["pet_grooming"], verificationStatus: "verified", available: true },
    ], [intent!.capability]);
    expect(ranked[0]?.userId).toBe("w1");
    const o = new Order("o9", "cust9", 20000, "sd_groom", "sv9");
    o.confirm();
    expect(o.status).toBe("confirmed");
  });

  it("3. house construction: dependency chain unblocks only on completion", () => {
    const g = new ProjectGraph()
      .addService("architecture").addService("engineering", ["architecture"])
      .addService("construction", ["engineering"]).addService("finishing", ["construction"]);
    expect(g.readiness("construction")).toBe("blocked");
    g.setOrder("architecture", "completed");
    g.setOrder("engineering", "completed");
    expect(g.readiness("construction")).toBe("unblocked");
  });

  it("8. new business type purely by configuration (no new frontend page)", () => {
    registerBusinessTemplate({
      id: "aquaculture_farm", label: "Aquaculture farm", capabilities: ["farming"],
      workspaceModules: ["dashboard", "services", "inventory"], sensitiveModules: { finance: ["owner"] },
      requiredDocuments: ["business_registration"], pricingModels: ["fixed_price"],
      sections: [{ id: "identity", fields: [{ id: "legal_name", label: "Legal name", component: "TEXT", required: true }] }],
    });
    const s = new BusinessOnboardingSession("orgAq", "aquaculture_farm").begin();
    s.answer("legal_name", "AquaFarm Ltd");
    s.documents.push({ type: "business_registration", status: "submitted" });
    s.submit();
    s.verify(true);
    expect(s.status).toBe("activated");
  });
});