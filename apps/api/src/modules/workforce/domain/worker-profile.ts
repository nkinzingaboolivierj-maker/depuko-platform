export type WorkerVerificationStatus = "pending" | "under_review" | "verified" | "rejected";
export class WorkerProfile {
  constructor(
    public readonly userId: string,
    public headline: string,
    public country: string,
    public skills: string[] = [],
    public verificationStatus: WorkerVerificationStatus = "pending",
  ) {
    if (!userId || !headline.trim() || !country.trim()) throw new Error("worker profile requires identity, headline and country");
  }
  claimSkill(skill: string): void {
    const value = skill.trim();
    if (!value) throw new Error("skill is required");
    if (!this.skills.includes(value)) this.skills.push(value);
  }
}
