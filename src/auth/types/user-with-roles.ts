import { Role } from '@prisma/client';
import { Permission } from '@prisma/client';

export interface AuthenticatedUser {
  userId: number;
  email: string;
  roles: Role[];
  permissions: Permission[];
}
