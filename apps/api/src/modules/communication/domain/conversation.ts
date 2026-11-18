export interface ConversationMessage { id: string; fromUser: string; text: string; sentAt: Date }
export class Conversation {
  private readonly messages: ConversationMessage[] = [];
  private readonly participants: Set<string>;
  constructor(public readonly id: string, public readonly scope: "customer_worker" | "project_team" | "support", participantIds: string[]) {
    if (!id || participantIds.length < 2 || new Set(participantIds).size !== participantIds.length) throw new Error("conversation requires distinct participants");
    this.participants = new Set(participantIds);
  }
  isParticipant(userId: string): boolean { return this.participants.has(userId); }
  post(userId: string, text: string): void {
    if (!this.isParticipant(userId)) throw new Error("NOT A PARTICIPANT");
    const value = text.trim();
    if (!value) throw new Error("message cannot be empty");
    this.messages.push({ id: `msg_${this.messages.length + 1}`, fromUser: userId, text: value, sentAt: new Date() });
  }
  history(userId: string): ConversationMessage[] {
    if (!this.isParticipant(userId)) throw new Error("NOT A PARTICIPANT");
    return [...this.messages];
  }
}
