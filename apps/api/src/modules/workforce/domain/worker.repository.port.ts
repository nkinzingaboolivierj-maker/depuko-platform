export interface WorkerProfileRow {
  userId: string;
  headline: string;
  country: string;
  skills: string[];
  verificationStatus: "pending" | "under_review" | "verified" | "rejected";
}
export interface WorkerRepositoryPort {
  findById(userId: string): Promise<WorkerProfileRow | null>;
  save(profile: WorkerProfileRow): Promise<void>;
  findVerifiedBySkills(skills: string[]): Promise<WorkerProfileRow[]>;
  setVerification(userId: string, status: WorkerProfileRow["verificationStatus"]): Promise<boolean>;
}
export const WORKER_REPOSITORY = "WORKER_REPOSITORY";
