import { Module } from "@nestjs/common";
import { PgTicketRepository } from "./infrastructure/pg-ticket.repository";
import { TICKET_REPOSITORY } from "./domain/ticket.repository.port";
import { SupportController } from "./presentation/support.controller";

@Module({
  providers: [{ provide: TICKET_REPOSITORY, useClass: PgTicketRepository }],
  controllers: [SupportController],
})
export class SupportModule {}