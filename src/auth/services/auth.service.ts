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

/**
 * Service handling authentication-related operations including user registration,
 * login, and role management.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Registers a new user with their organization.
   * Creates a new organization, user account, and assigns admin role.
   *
   * @param registerUserDto - The user registration data
   * @returns Object containing the created user and JWT token
   * @throws ConflictException if user with email already exists
   * @throws InternalServerErrorException if registration fails
   */
  async register(registerUserDto: RegisterUserDto) {
    const { firstName, lastName, email, password } = registerUserDto;
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

    const organizationName = `${firstName}'s Organization ${Date.now()}`;

    return this.prisma.$transaction(async (prisma) => {
      try {
        const organization = await prisma.organization.create({
          data: { name: organizationName },
        });

        const user = await prisma.user.create({
          data: {
            firstName,
            lastName,
            email,
            password: hashedPassword,
            organizationId: organization.id,
          },
        });

        const adminRole = await prisma.role.findUnique({
          where: { name: 'admin' },
        });
        if (!adminRole) {
          this.logger.error('User registration failed: Admin role not found');
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

  /**
   * Authenticates a user and generates a JWT token.
   *
   * @param loginUserDto - The login credentials
   * @returns Object containing the user and JWT token
   * @throws UnauthorizedException if credentials are invalid
   */
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

  /**
   * Generates a JWT token for the user.
   *
   * @param userId - The user's unique identifier
   * @param email - The user's email address
   * @returns Signed JWT token
   * @throws InternalServerErrorException if token generation fails
   */
  private generateToken(userId: string, email: string): string {
    try {
      return this.jwtService.sign({ userId, email, roles: ['admin'] });
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(
        `JWT Token generation failed: ${err.message}`,
        err.stack,
      );
      throw new InternalServerErrorException('Failed to generate token');
    }
  }

  /**
   * Creates a new user in the system.
   *
   * @param options - User creation options including personal details and organization
   * @returns The created user
   */
  async createUser(options: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    organizationId: string;
  }) {
    return this.prisma.user.create({
      data: {
        firstName: options.firstName,
        lastName: options.lastName,
        email: options.email,
        password: options.password,
        organizationId: options.organizationId,
      },
    });
  }

  /**
   * Assigns a role to a user.
   *
   * @param assignRoleDto - The role assignment details
   * @returns Success message
   * @throws NotFoundException if user or role not found
   * @throws ConflictException if user already has the role
   */
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
