/** Reviews (S29). ONLY eligible completed work may be reviewed - eligibility
 * is checked against the completed order/assignment, never assumed. Fake
 * review protections: one review per party per work, verified-work gate. */
export class Review {
  constructor(
    public readonly id: string,
    public readonly workRef: string,
    public readonly authorId: string,
    public readonly subjectId: string,
    public readonly dimensions: { quality: number; punctuality: number; communication: number },
    public readonly comment?: string,
    public moderation: "published" | "hidden" | "removed" = "published",
  ) {
    for (const v of [dimensions.quality, dimensions.punctuality, dimensions.communication]) {
      if (!Number.isInteger(v) || v < 1 || v > 5) throw new Error("ratings must be integers 1-5");
    }
    if (authorId === subjectId) throw new Error("cannot review yourself");
  }
  average(): number {
    const d = this.dimensions;
    return Math.round(((d.quality + d.punctuality + d.communication) / 3) * 10) / 10;
  }
  hide(): void { this.moderation = "hidden"; }
  remove(): void { this.moderation = "removed"; }
  isVisible(): boolean { return this.moderation === "published"; }
}

/** Eligibility: a review may exist only for COMPLETED work, once per party. */
export class ReviewEligibility {
  private readonly reviewed = new Set<string>();
  constructor(private readonly completedWork: Set<string>) {}
  isEligible(workRef: string, authorId: string, subjectId: string): { eligible: boolean; reason?: string } {
    if (!this.completedWork.has(workRef)) return { eligible: false, reason: "work is not completed - review refused" };
    if (authorId === subjectId) return { eligible: false, reason: "self-review refused" };
    const key = workRef + "|" + authorId + "|" + subjectId;
    if (this.reviewed.has(key)) return { eligible: false, reason: "duplicate review refused" };
    return { eligible: true };
  }
  markReviewed(workRef: string, authorId: string, subjectId: string): void {
    this.reviewed.add(workRef + "|" + authorId + "|" + subjectId);
  }
}