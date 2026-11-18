import { Module } from "@nestjs/common";
import { NotificationsController } from "./notifications.controller";

/** In-app read path only; external channels remain BLOCKED BY EXTERNAL
 * DEPENDENCY (owner credentials) - preferences/quiet hours domain shipped
 * in V5 with tests. */
@Module({ controllers: [NotificationsController] })
export class NotificationsModule {}