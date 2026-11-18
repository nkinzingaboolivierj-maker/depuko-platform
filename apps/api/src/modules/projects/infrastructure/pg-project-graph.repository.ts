import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../../../infrastructure/database/database.service";
import { ProjectGraphRepositoryPort } from "../domain/project-graph.repository.port";

/** V5 fix #4: the DB composite FK does NOT guarantee acyclicity by itself.
 * addService runs a RECURSIVE CTE cycle check INSIDE the same transaction as
 * the edge insert: a would-be cycle aborts the transaction before it lands. */
@Injectable()
export class PgProjectGraphRepository implements ProjectGraphRepositoryPort {
  constructor(private readonly db: DatabaseService) {}

  async addService(projectId: string, serviceId: string, dependsOn: string[]): Promise<void> {
    await this.db.withTransaction(async q => {
      await q(
        `INSERT INTO project_services (project_id, service_id) VALUES ($1, $2)
         ON CONFLICT (project_id, service_id) DO NOTHING`,
        [projectId, serviceId],
      );
      for (const dep of dependsOn) {
        const cycle = await q<{ hit: string }>(
          `WITH RECURSIVE walk AS (
             SELECT service_id AS node FROM project_service_edges
              WHERE project_id = $1 AND service_id = $2
             UNION
             SELECT e.depends_on AS node FROM project_service_edges e
               JOIN walk w ON e.service_id = w.node
              WHERE e.project_id = $1
           )
           SELECT 'cycle' AS hit FROM walk WHERE node = $3 LIMIT 1`,
          [projectId, dep, serviceId],
        );
        if (cycle.length > 0) {
          throw new Error("DEPENDENCY CYCLE REJECTED: adding " + dep + " would make " + serviceId + " reach itself");
        }
        await q(
          `INSERT INTO project_service_edges (project_id, service_id, depends_on) VALUES ($1, $2, $3)`,
          [projectId, serviceId, dep],
        );
      }
    });
  }

  async listServices(projectId: string): Promise<Array<{ serviceId: string; status: string; dependsOn: string[] }>> {
    const rows = await this.db.query<{ service_id: string; order_status: string; depends_on: string | null }>(
      `SELECT ps.service_id, ps.order_status, e.depends_on
       FROM project_services ps LEFT JOIN project_service_edges e
         ON e.project_id=ps.project_id AND e.service_id=ps.service_id
       WHERE ps.project_id=$1 ORDER BY ps.created_at, ps.service_id`, [projectId]);
    const map = new Map<string, { serviceId: string; status: string; dependsOn: string[] }>();
    for (const row of rows) {
      const item = map.get(row.service_id) ?? { serviceId: row.service_id, status: row.order_status, dependsOn: [] };
      if (row.depends_on) item.dependsOn.push(row.depends_on);
      map.set(row.service_id, item);
    }
    return [...map.values()];
  }

  async setOrderStatus(projectId: string, serviceId: string, status: string): Promise<void> {
    await this.db.query(
      `UPDATE project_services SET order_status = $3 WHERE project_id = $1 AND service_id = $2`,
      [projectId, serviceId, status],
    );
  }

  async readiness(projectId: string, serviceId: string): Promise<"blocked" | "unblocked"> {
    const rows = await this.db.query<{ blocked: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM project_service_edges e
          WHERE e.project_id = $1 AND e.service_id = $2
            AND NOT EXISTS (
              SELECT 1 FROM project_services ps
               WHERE ps.project_id = $1 AND ps.service_id = e.depends_on
                 AND ps.order_status = 'completed')
       ) AS blocked`,
      [projectId, serviceId],
    );
    return rows[0]?.blocked ? "blocked" : "unblocked";
  }

  async downstreamAffected(projectId: string, serviceId: string): Promise<string[]> {
    const rows = await this.db.query<{ node: string }>(
      `WITH RECURSIVE walk AS (
         SELECT service_id AS node FROM project_service_edges
          WHERE project_id = $1 AND depends_on = $2
         UNION
         SELECT e.service_id AS node FROM project_service_edges e
           JOIN walk w ON e.depends_on = w.node
          WHERE e.project_id = $1
       )
       SELECT node FROM walk`,
      [projectId, serviceId],
    );
    return rows.map(r => r.node);
  }
}