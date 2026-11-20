import { Module } from "@nestjs/common";
import { SecurityModule } from "../security/security.module";
import { FilesController } from "./presentation/files.controller";

/** Private S3-compatible storage and fail-closed malware scanning. */
@Module({
  imports:[SecurityModule],
  controllers:[FilesController],
})
export class FilesModule {}