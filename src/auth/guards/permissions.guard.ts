import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

import { PERMISSIONS_KEY } from '@/auth/decorators/permissions.decorator';
import { AuthenticatedUser } from '@/auth/types/user-with-roles';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.get<string[]>(
      PERMISSIONS_KEY,
      context.getHandler(),
    );
    if (!requiredPermissions) {
      return true;
    } // No permissions required, allow access

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as AuthenticatedUser;

    if (!user || !user.permissions) {
      throw new ForbiddenException('Access denied: No permissions assigned');
    }

    const hasPermission = user.permissions.some((perm) =>
      requiredPermissions.includes(perm.name),
    );
    if (!hasPermission) {
      throw new ForbiddenException('Access denied: Insufficient permissions');
    }

    return true;
  }
}
