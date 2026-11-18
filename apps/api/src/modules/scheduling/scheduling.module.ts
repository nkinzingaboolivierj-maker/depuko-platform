import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { SecurityModule } from "../security/security.module";
import { PgAssignmentRepository } from "./infrastructure/pg-assignment.repository";
import { ASSIGNMENT_REPOSITORY } from "./domain/assignment.repository.port";
import { SchedulingController } from "./presentation/scheduling.controller";

@Module({
  imports: [AuthModule, SecurityModule],
  providers: [{ provide: ASSIGNMENT_REPOSITORY, useClass: PgAssignmentRepository }],
  controllers: [SchedulingController],
})
export class SchedulingModule {}