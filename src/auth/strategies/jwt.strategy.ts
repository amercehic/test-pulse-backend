import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@db/prisma.service';
import { AuthenticatedUser } from '@/auth/types/user-with-roles';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is not set in environment variables');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: secret,
    });
  }

  async validate(payload: {
    userId: number;
    email: string;
  }): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        roles: { include: { role: true } }, // ✅ Ensure roles are loaded
        permissions: { include: { permission: true } }, // ✅ Ensure permissions are loaded
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      ...user,
      roles: user.roles.map((userRole) => userRole.role),
      permissions: user.permissions.map(
        (userPermission) => userPermission.permission,
      ),
    };
  }
}
