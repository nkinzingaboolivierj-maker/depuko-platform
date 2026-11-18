import { Module } from "@nestjs/common";
import { NotificationsController } from "./notifications.controller";
import { AuthModule } from "../auth/auth.module";
import { AuthGuard } from "../security/infrastructure/guards/auth.guard";

/** In-app read path only; external channels remain BLOCKED BY EXTERNAL
 * DEPENDENCY (owner credentials) - preferences/quiet hours domain shipped
 * in V5 with tests. */
@Module({
  imports: [AuthModule],
  controllers: [NotificationsController],
  providers: [AuthGuard],
})
export class NotificationsModule {}