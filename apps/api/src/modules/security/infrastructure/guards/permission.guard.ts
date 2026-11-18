import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { USER_REPOSITORY, UserRepositoryPort } from '../../../users/domain/user.repository.port';
import { PermissionPolicy } from '../../domain/permission-policy';
import { REQUIRE_PERMISSION_KEY } from './require-permission.decorator';

/**
 * Must run after AuthGuard (which sets request.userId). Looks up the real
 * user record for their current roles — roles are not trusted from the
 * request/token itself, only from the database (§4: never trust external
 * input without validation).
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const action = this.reflector.get<string>(REQUIRE_PERMISSION_KEY, context.getHandler());
    if (!action) return true; // route has no permission requirement

    const request = context.switchToHttp().getRequest();
    const userId: string | undefined = request.userId;
    if (!userId) {
      throw new ForbiddenException('No authenticated user on request');
    }

    const user = await this.users.findById(userId);
    if (!user) {
      throw new ForbiddenException('User not found');
    }

    if (!PermissionPolicy.isAllowed(action, user.roles)) {
      throw new ForbiddenException(`Missing permission: ${action}`);
    }
    return true;
  }
}
