import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { UsersModule } from "../users/users.module";
import { AuthGuard } from "../security/infrastructure/guards/auth.guard";
import { PermissionGuard } from "../security/infrastructure/guards/permission.guard";
import { WorkforceController } from "./presentation/workforce.controller";
import { PgWorkerRepository } from "./infrastructure/pg-worker.repository";
import { WORKER_REPOSITORY } from "./domain/worker.repository.port";
@Module({ imports: [AuthModule, UsersModule], controllers: [WorkforceController], providers: [AuthGuard, PermissionGuard, { provide: WORKER_REPOSITORY, useClass: PgWorkerRepository }], exports: [WORKER_REPOSITORY] })
export class WorkforceModule {}
