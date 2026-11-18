import { Module } from "@nestjs/common";
import { PgAssetRepository } from "./infrastructure/pg-asset.repository";
import { ASSET_REPOSITORY } from "./domain/asset.repository.port";
import { AssetsController } from "./presentation/assets.controller";
import { AuthModule } from "../auth/auth.module";
import { AuthGuard } from "../security/infrastructure/guards/auth.guard";

@Module({
  imports: [AuthModule],
  providers: [{ provide: ASSET_REPOSITORY, useClass: PgAssetRepository }, AuthGuard],
  controllers: [AssetsController],
})
export class AssetsModule {}