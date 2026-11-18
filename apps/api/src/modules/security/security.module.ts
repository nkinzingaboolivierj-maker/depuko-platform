import { Global, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { AuthGuard } from './infrastructure/guards/auth.guard';
import { PermissionGuard } from './infrastructure/guards/permission.guard';

/**
 * Authorization policy engine (§11: "Permissions: Authorization policy
 * engine"). Owns the answer to "is this role allowed to do this?" — every
 * other module consumes AuthGuard + PermissionGuard rather than
 * reimplementing role checks.
 *
 * @Global(): AuthGuard/PermissionGuard are applied via `@UseGuards(ClassRef)`
 * in other modules' controllers (e.g. services). Nest resolves class-
 * reference guards against the root DI container, so this module (and its
 * SESSION_REPOSITORY/USER_REPOSITORY dependencies) needs to be visible
 * application-wide, not just to modules that explicitly import it.
 */
@Global()
@Module({
  imports: [AuthModule, UsersModule],
  providers: [AuthGuard, PermissionGuard],
  exports: [AuthGuard, PermissionGuard],
})
export class SecurityModule {}
