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
      if (
        info?.name === 'JsonWebTokenError' ||
        info?.name === 'TokenExpiredError'
      ) {
        throw new ForbiddenException('Invalid or expired token');
      }

      throw new UnauthorizedException('Unauthorized access');
    }

    return user;
  }
}
