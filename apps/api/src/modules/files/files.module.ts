import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { UsersModule } from "../users/users.module";
import { SecurityModule } from "../security/security.module";
import { AuthGuard } from "../security/infrastructure/guards/auth.guard";
import { FilesController } from "./presentation/files.controller";

/** Private S3-compatible storage and fail-closed malware scanning. */
@Module({
  imports: [SecurityModule, AuthModule, UsersModule],
  controllers: [FilesController],
  providers: [AuthGuard],
})
export class FilesModule {}
