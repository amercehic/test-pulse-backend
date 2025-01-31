import {
  Injectable,
  UnauthorizedException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@db/prisma.service';
import * as bcrypt from 'bcrypt';
import { RegisterUserDto } from '@/auth/dto/register-user.dto';
import { LoginUserDto } from '@/auth/dto/login-user.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  // 🔹 Register a New User
  async register(registerUserDto: RegisterUserDto) {
    const { email, password, organizationId } = registerUserDto;

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      this.logger.warn(
        `Registration failed: User with email ${email} already exists.`,
      );
      throw new UnauthorizedException('User with this email already exists');
    }

    // Hash password before storing
    const hashedPassword = await bcrypt.hash(password, 10);

    // Start transaction to ensure rollback if any step fails
    return this.prisma.$transaction(async (prisma) => {
      try {
        // Create user in the database
        const user = await prisma.user.create({
          data: {
            email,
            password: hashedPassword,
            organizationId,
          },
        });

        // Generate access token
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

  // 🔹 User Login
  async login(loginUserDto: LoginUserDto) {
    const { email, password } = loginUserDto;

    // Find user in database
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      this.logger.warn(`Login failed: No user found with email ${email}`);
      throw new UnauthorizedException('Invalid email or password');
    }

    // Validate password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      this.logger.warn(`Login failed: Incorrect password for email ${email}`);
      throw new UnauthorizedException('Invalid email or password');
    }

    // Generate access token
    const token = this.generateToken(user.id, user.email);

    return { user, token };
  }

  // 🔹 Generate JWT Token
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
}
