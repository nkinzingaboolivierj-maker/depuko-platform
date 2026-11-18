export const PROJECT_GRAPH_REPOSITORY = "PROJECT_GRAPH_REPOSITORY";

export interface ProjectGraphRepositoryPort {
  addService(projectId: string, serviceId: string, dependsOn: string[]): Promise<void>;
  listServices(projectId: string): Promise<Array<{ serviceId: string; status: string; dependsOn: string[] }>>;
  setOrderStatus(projectId: string, serviceId: string, status: string): Promise<void>;
  readiness(projectId: string, serviceId: string): Promise<"blocked" | "unblocked">;
  downstreamAffected(projectId: string, serviceId: string): Promise<string[]>;
}