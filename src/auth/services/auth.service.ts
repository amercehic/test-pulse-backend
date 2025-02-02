import {
  Injectable,
  UnauthorizedException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@db/prisma.service';
import * as bcrypt from 'bcrypt';
import { RegisterUserDto } from '@/auth/dto/register-user.dto';
import { LoginUserDto } from '@/auth/dto/login-user.dto';
import { AssignRoleDto } from '@/roles/dto/assign-role.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Registers a new user in the system.
   * @param registerUserDto - Data transfer object containing user registration details (email, password, organizationId).
   * @returns An object containing the newly created user and a JWT token.
   * @throws UnauthorizedException if a user with the same email already exists.
   * @throws InternalServerErrorException if the registration process fails.
   */
  async register(registerUserDto: RegisterUserDto) {
    const { email, password, organizationId } = registerUserDto;

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      this.logger.warn(
        `Registration failed: User with email ${email} already exists.`,
      );
      throw new UnauthorizedException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    return this.prisma.$transaction(async (prisma) => {
      try {
        const user = await prisma.user.create({
          data: {
            email,
            password: hashedPassword,
            organizationId,
          },
        });

        const token = this.generateToken(user.id, user.email);

        return { user, token };
      } catch (error: unknown) {
        const err = error as Error;
        this.logger.error(
          `User registration failed: ${err.message}`,
          err.stack,
        );
        throw new InternalServerErrorException('User registration failed');
      }
    });
  }

  /**
   * Authenticates a user and generates a JWT token upon successful login.
   * @param loginUserDto - Data transfer object containing user login details (email, password).
   * @returns An object containing the authenticated user and a JWT token.
   * @throws UnauthorizedException if the email or password is invalid.
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
   * Generates a JWT token for a user.
   * @param userId - The ID of the user.
   * @param email - The email of the user.
   * @returns A JWT token as a string.
   * @throws InternalServerErrorException if token generation fails.
   */
  private generateToken(userId: number, email: string): string {
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

  /**
   * Assigns a role to a user.
   * @param assignRoleDto - Data transfer object containing the user ID and role ID.
   * @returns A success message indicating the role was assigned.
   * @throws NotFoundException if the user or role does not exist.
   * @throws ConflictException if the user already has the specified role.
   */
  async assignRole(assignRoleDto: AssignRoleDto) {
    const { userId, roleId } = assignRoleDto;

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    const existingUserRole = await this.prisma.userRole.findFirst({
      where: { userId, roleId },
    });
    if (existingUserRole) {
      throw new ConflictException('User already has this role');
    }

    await this.prisma.userRole.create({
      data: {
        userId,
        roleId,
      },
    });

    return { message: `Role ${role.name} assigned to user ${user.email}` };
  }
}
