import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AuthGuard } from "../security/infrastructure/guards/auth.guard";
import { PgTicketRepository } from "./infrastructure/pg-ticket.repository";
import { TICKET_REPOSITORY } from "./domain/ticket.repository.port";
import { SupportController } from "./presentation/support.controller";

@Module({
  imports: [AuthModule],
  providers: [{ provide: TICKET_REPOSITORY, useClass: PgTicketRepository }, AuthGuard],
  controllers: [SupportController],
})
export class SupportModule {}