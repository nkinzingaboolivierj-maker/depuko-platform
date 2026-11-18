/** Capabilities & Skills (S22). Self-declared skills are NOT verified
 * competence: verification status is explicit and evidence-backed. */
export type VerificationStatus = "self_declared" | "under_assessment" | "verified" | "rejected";

export class SkillDefinition {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly occupation: string,
    public version = 1,
  ) {}
  bumpVersion(): void { this.version += 1; }
}

export class WorkerSkillClaim {
  constructor(
    public readonly workerId: string,
    public readonly skillId: string,
    public verification: VerificationStatus = "self_declared",
    public evidenceRefs: string[] = [],
    public assessmentScore?: number,
  ) {}
  attachEvidence(ref: string): void {
    if (!ref) throw new Error("evidence reference required");
    this.evidenceRefs.push(ref);
    if (this.verification === "self_declared") this.verification = "under_assessment";
  }
  markVerified(assessmentScore: number): void {
    if (this.verification !== "under_assessment") throw new Error("verification requires prior assessment with evidence");
    if (!Number.isInteger(assessmentScore) || assessmentScore < 0 || assessmentScore > 100) throw new Error("assessment score 0-100");
    this.assessmentScore = assessmentScore;
    this.verification = "verified";
  }
  reject(): void {
    if (this.verification === "verified") throw new Error("verified claims are only changed via appeal");
    this.verification = "rejected";
  }
  /** Dispatch only ever matches VERIFIED claims (see dispatch policy). */
  isVerified(): boolean { return this.verification === "verified"; }
}