import type { AssignmentStatus } from "./assignment";

export const ASSIGNMENT_REPOSITORY = "ASSIGNMENT_REPOSITORY";

export interface AssignmentRow {
  id: string; order_id: string; worker_user_id: string;
  status: AssignmentStatus; agreed_duration_minutes: number; approved_extension_minutes: number;
}

export interface AssignmentRepositoryPort {
  save(row: AssignmentRow): Promise<void>;
  findByIdForWorker(id: string, workerUserId: string): Promise<AssignmentRow | null>;
  listForWorker(workerUserId: string): Promise<AssignmentRow[]>;
}