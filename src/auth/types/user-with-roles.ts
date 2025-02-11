import { Role } from '@prisma/client';
import { Permission } from '@prisma/client';

export interface AuthenticatedUser {
  userId: string;
  email: string;
  organizationId: string;
  roles: Role[];
  permissions: Permission[];
}
