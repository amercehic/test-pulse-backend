import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      // ✅ Return 403 Forbidden for invalid or expired tokens
      if (
        info?.name === 'JsonWebTokenError' ||
        info?.name === 'TokenExpiredError'
      ) {
        throw new ForbiddenException('Invalid or expired token');
      }

      // ✅ Return 401 Unauthorized when token is missing
      throw new UnauthorizedException('Unauthorized access');
    }

    return user;
  }
}
