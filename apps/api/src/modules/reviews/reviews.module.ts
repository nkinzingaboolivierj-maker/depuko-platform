import { Module } from "@nestjs/common";
import { PgReviewRepository } from "./infrastructure/pg-review.repository";
import { REVIEW_REPOSITORY } from "./domain/review.repository.port";
import { ReviewsController } from "./presentation/reviews.controller";

@Module({
  providers: [{ provide: REVIEW_REPOSITORY, useClass: PgReviewRepository }],
  controllers: [ReviewsController],
})
export class ReviewsModule {}