import { Module } from "@nestjs/common";
import { PgAssetRepository } from "./infrastructure/pg-asset.repository";
import { ASSET_REPOSITORY } from "./domain/asset.repository.port";
import { AssetsController } from "./presentation/assets.controller";

@Module({
  providers: [{ provide: ASSET_REPOSITORY, useClass: PgAssetRepository }],
  controllers: [AssetsController],
})
export class AssetsModule {}