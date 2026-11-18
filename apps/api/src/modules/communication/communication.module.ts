import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AuthGuard } from "../security/infrastructure/guards/auth.guard";
import { CommunicationController } from "./presentation/communication.controller";
import { PgConversationRepository } from "./infrastructure/pg-conversation.repository";
@Module({ imports: [AuthModule], controllers: [CommunicationController], providers: [AuthGuard, PgConversationRepository] })
export class CommunicationModule {}
