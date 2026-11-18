import { Global, Module } from "@nestjs/common";
import { AUDIT_LOG, PgAuditLog } from "./audit-log.service";

@Global()
@Module({
  providers: [{ provide: AUDIT_LOG, useClass: PgAuditLog }],
  exports: [AUDIT_LOG],
})
export class AuditModule {}