import { SetMetadata } from '@nestjs/common';

export const REQUIRE_PERMISSION_KEY = 'requirePermission';

/** Apply alongside @UseGuards(AuthGuard, PermissionGuard) on a route handler. */
export const RequirePermission = (action: string) => SetMetadata(REQUIRE_PERMISSION_KEY, action);
