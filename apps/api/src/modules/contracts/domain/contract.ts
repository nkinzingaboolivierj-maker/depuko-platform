export type ContractStatus = "draft" | "sent" | "signed" | "superseded";
export class Contract {
  constructor(
    public readonly id: string,
    public readonly version: number,
    public readonly terms: Record<string, unknown>,
    public readonly partyIds: string[],
    public status: ContractStatus = "draft",
  ) {
    if (!id || !Number.isInteger(version) || version < 1 || partyIds.length < 2 || new Set(partyIds).size !== partyIds.length) throw new Error("invalid contract parties or version");
  }
  send(): void {
    if (this.status !== "draft") throw new Error("only draft contracts can be sent");
    this.status = "sent";
  }
  markSigned(): void {
    if (this.status !== "sent") throw new Error("only sent contracts can be signed");
    this.status = "signed";
  }
}
