import { Role } from '@prisma/client';
import { Permission } from '@prisma/client';

export interface AuthenticatedUser {
  userId: string; // Should be string, not number
  email: string;
  roles: Role[];
  permissions: Permission[];
}
