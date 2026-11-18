import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AuthGuard } from "../security/infrastructure/guards/auth.guard";
import { QuotesController } from "./presentation/quotes.controller";
@Module({ imports: [AuthModule], controllers: [QuotesController], providers: [AuthGuard] })
export class QuotesModule {}
