import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

import { ROLES_KEY } from '@/auth/decorators/roles.decorator';
import { AuthenticatedUser } from '@/auth/types/user-with-roles';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>(
      ROLES_KEY,
      context.getHandler(),
    );
    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as AuthenticatedUser;

    if (!user || !user.roles) {
      throw new ForbiddenException('Access denied: No role assigned');
    }

    const hasRole = user.roles.some((role) =>
      requiredRoles.includes(role.name),
    );
    if (!hasRole) {
      throw new ForbiddenException('Access denied: Insufficient role');
    }

    return true;
  }
}
