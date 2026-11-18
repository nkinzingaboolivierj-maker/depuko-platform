export const TRUST_CASE_REPOSITORY = "TRUST_CASE_REPOSITORY";

export interface CaseRow {
  id: string; kind: string; subject_id: string; status: string;
  decided_by: string | null; rationale: string | null;
}

export interface TrustCaseRepositoryPort {
  save(row: CaseRow): Promise<void>;
  findById(id: string): Promise<CaseRow | null>;
}