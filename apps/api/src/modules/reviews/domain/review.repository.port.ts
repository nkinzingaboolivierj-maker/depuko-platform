export const REVIEW_REPOSITORY = "REVIEW_REPOSITORY";

export interface ReviewRow {
  id: string; work_ref: string; author_id: string; subject_id: string;
  quality: number; punctuality: number; communication: number;
  comment: string | null; moderation: string;
}

export interface ReviewRepositoryPort {
  save(row: ReviewRow): Promise<void>;
  findByWorkForParty(workRef: string, userId: string): Promise<ReviewRow | null>;
  listVisibleForSubject(subjectId: string): Promise<ReviewRow[]>;
  setModeration(id: string, moderation: "published" | "hidden"): Promise<boolean>;
}