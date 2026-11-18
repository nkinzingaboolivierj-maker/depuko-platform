/** Project dependency graph (S27). DAG BY CONSTRUCTION at the domain layer:
 * dependsOn may only reference nodes already present. */
export class ProjectGraph {
  private nodes = new Map<string, { dependsOn: Set<string>; orderStatus?: string }>();

  addService(id: string, dependsOn: readonly string[] = []): this {
    if (this.nodes.has(id)) throw new Error("service already in graph: " + id);
    for (const dep of dependsOn) {
      if (!this.nodes.has(dep)) throw new Error(`dependency must already exist: ${dep}`);
    }
    this.nodes.set(id, { dependsOn: new Set(dependsOn) });
    return this;
  }
  setOrder(id: string, status: string): void {
    const n = this.nodes.get(id);
    if (!n) throw new Error("unknown service: " + id);
    n.orderStatus = status;
  }
  readiness(id: string): "blocked" | "unblocked" {
    const n = this.nodes.get(id);
    if (!n) throw new Error("unknown service: " + id);
    for (const dep of n.dependsOn) {
      if (this.nodes.get(dep)!.orderStatus !== "completed") return "blocked";
    }
    return "unblocked";
  }
  downstreamAffected(id: string): string[] {
    const affected = new Set<string>();
    const queue = [id];
    while (queue.length) {
      const cur = queue.shift()!;
      for (const [nid, n] of this.nodes) {
        if (n.dependsOn.has(cur) && !affected.has(nid)) { affected.add(nid); queue.push(nid); }
      }
    }
    return [...affected];
  }
}