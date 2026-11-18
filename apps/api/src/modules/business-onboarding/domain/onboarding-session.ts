import { getBusinessTemplate } from "./templates";
export type OnboardingStatus = "registered" | "onboarding_in_progress" | "under_verification" | "rejected" | "activated";
export interface OnboardingDocument { type: string; status: "submitted" | "approved" | "rejected" }
export class BusinessOnboardingSession {
  readonly answers: Record<string, unknown> = {};
  readonly documents: OnboardingDocument[] = [];
  status: OnboardingStatus = "registered";
  rejectionReasons: string[] = [];
  constructor(public readonly organizationId: string, public readonly templateId: string) {
    if (!organizationId || !getBusinessTemplate(templateId)) throw new Error("unknown organization or business template");
  }
  begin(): this {
    if (this.status === "registered" || this.status === "rejected") this.status = "onboarding_in_progress";
    return this;
  }
  answer(fieldId: string, value: unknown): void {
    if (this.status !== "onboarding_in_progress") throw new Error("onboarding is not editable");
    if (!fieldId || value === undefined || value === null || value === "") throw new Error("answer is required");
    const template = getBusinessTemplate(this.templateId)!;
    const known = template.sections.some((s) => s.fields.some((f) => f.id === fieldId));
    if (!known) throw new Error("unknown onboarding field");
    this.answers[fieldId] = value;
  }
  missingRequired(): string[] {
    const template = getBusinessTemplate(this.templateId)!;
    const fields = template.sections.flatMap((s) => s.fields).filter((f) => f.required);
    const missing = fields.filter((f) => this.answers[f.id] === undefined || this.answers[f.id] === "").map((f) => f.id);
    for (const required of template.requiredDocuments) {
      if (!this.documents.some((d) => d.type === required && d.status !== "rejected")) missing.push(`document:${required}`);
    }
    return missing;
  }
  submit(): void {
    if (this.status !== "onboarding_in_progress") throw new Error("onboarding cannot be submitted in current state");
    const missing = this.missingRequired();
    if (missing.length) throw new Error(`missing required onboarding items: ${missing.join(", ")}`);
    this.status = "under_verification";
  }
  verify(approved: boolean, reasons: string[] = []): void {
    if (this.status !== "under_verification") throw new Error("onboarding is not awaiting verification");
    this.rejectionReasons = approved ? [] : reasons;
    if (!approved && reasons.length === 0) throw new Error("rejection rationale is required");
    this.status = approved ? "activated" : "rejected";
  }
}
