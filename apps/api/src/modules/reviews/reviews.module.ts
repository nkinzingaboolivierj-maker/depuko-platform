import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { UsersModule } from "../users/users.module";
import { AuthGuard } from "../security/infrastructure/guards/auth.guard";
import { PermissionGuard } from "../security/infrastructure/guards/permission.guard";
import { PgReviewRepository } from "./infrastructure/pg-review.repository";
import { REVIEW_REPOSITORY } from "./domain/review.repository.port";
import { ReviewsController } from "./presentation/reviews.controller";

@Module({
  imports: [AuthModule, UsersModule],
  providers: [{ provide: REVIEW_REPOSITORY, useClass: PgReviewRepository }, AuthGuard, PermissionGuard],
  controllers: [ReviewsController],
})
export class ReviewsModule {}