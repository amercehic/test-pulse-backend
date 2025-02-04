import { PrismaService } from '@db/prisma.service';
import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { LoginUserDto } from '@/auth/dto/login-user.dto';
import { RegisterUserDto } from '@/auth/dto/register-user.dto';
import { AssignRoleDto } from '@/roles/dto/assign-role.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerUserDto: RegisterUserDto) {
    const { email, password } = registerUserDto;

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      this.logger.warn(
        `Registration failed: User with email ${email} already exists.`,
      );
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    return this.prisma.$transaction(async (prisma) => {
      try {
        const organization = await prisma.organization.create({
          data: { name: `${email}'s Organization` },
        });

        const user = await prisma.user.create({
          data: {
            email,
            password: hashedPassword,
            organizationId: organization.id,
          },
        });

        const adminRole = await prisma.role.findUnique({
          where: { name: 'admin' },
        });

        if (!adminRole) {
          this.logger.error(`User registration failed: Admin role not found`);
          throw new InternalServerErrorException('Admin role not found');
        }

        await prisma.userRole.create({
          data: {
            userId: user.id,
            roleId: adminRole.id,
          },
        });

        const token = this.generateToken(user.id, user.email);

        return { user, token };
      } catch (error: unknown) {
        this.logger.error(
          `User registration failed: ${(error as Error).message}`,
          error,
        );
        throw new InternalServerErrorException('User registration failed');
      }
    });
  }

  async login(loginUserDto: LoginUserDto) {
    const { email, password } = loginUserDto;

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      this.logger.warn(`Login failed: No user found with email ${email}`);
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      this.logger.warn(`Login failed: Incorrect password for email ${email}`);
      throw new UnauthorizedException('Invalid email or password');
    }

    const token = this.generateToken(user.id, user.email);

    return { user, token };
  }

  private generateToken(userId: string, email: string): string {
    try {
      return this.jwtService.sign({ userId, email });
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(
        `JWT Token generation failed: ${err.message}`,
        err.stack,
      );
      throw new InternalServerErrorException('Failed to generate token');
    }
  }

  async assignRole(assignRoleDto: AssignRoleDto) {
    const { userId, roleName } = assignRoleDto;

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const role = await this.prisma.role.findUnique({
      where: { name: roleName },
    });
    if (!role) {
      throw new NotFoundException(`Role ${roleName} not found`);
    }

    const existingUserRole = await this.prisma.userRole.findFirst({
      where: { userId, roleId: role.id },
    });

    if (existingUserRole) {
      throw new ConflictException('User already has this role');
    }

    await this.prisma.userRole.create({
      data: { userId, roleId: role.id },
    });

    return { message: `Role ${roleName} assigned to user ${user.email}` };
  }
}
