import { User, Role, Permission } from '@prisma/client';

export interface AuthenticatedUser extends User {
  roles: Role[];
  permissions: Permission[];
}
