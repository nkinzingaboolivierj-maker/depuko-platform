import { Module } from "@nestjs/common";
import { SecurityModule } from "../security/security.module";
import { TrainingController } from "./presentation/training.controller";

@Module({
  imports: [SecurityModule],
  controllers: [TrainingController],
})
export class TrainingModule {}