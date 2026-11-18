import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AuthGuard } from "../security/infrastructure/guards/auth.guard";
import { PgAssignmentRepository } from "./infrastructure/pg-assignment.repository";
import { ASSIGNMENT_REPOSITORY } from "./domain/assignment.repository.port";
import { SchedulingController } from "./presentation/scheduling.controller";

@Module({
  imports: [AuthModule],
  providers: [{ provide: ASSIGNMENT_REPOSITORY, useClass: PgAssignmentRepository }, AuthGuard],
  controllers: [SchedulingController],
})
export class SchedulingModule {}