export interface DispatchWorker { userId: string; skills: string[]; verificationStatus: string; available: boolean }
export function rankWorkersForSkills(workers: DispatchWorker[], requiredSkills: string[]): Array<DispatchWorker & { matchCount: number }> {
  const required = [...new Set(requiredSkills)];
  if (required.length === 0) return [];
  return workers
    .filter((worker) => worker.verificationStatus === "verified" && worker.available)
    .map((worker) => ({ ...worker, matchCount: required.filter((skill) => worker.skills.includes(skill)).length }))
    .filter((worker) => worker.matchCount > 0)
    .sort((a, b) => b.matchCount - a.matchCount || a.userId.localeCompare(b.userId));
}
