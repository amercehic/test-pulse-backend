import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { firstValueFrom, isObservable } from 'rxjs';

import { ApiKeyGuard } from '@/api-key/guards/api-key.guard';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';

@Injectable()
export class EitherAuthGuard implements CanActivate {
  constructor(
    private readonly jwtAuthGuard: JwtAuthGuard,
    private readonly apiKeyGuard: ApiKeyGuard,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    if (request.headers['x-api-key']) {
      try {
        const apiKeyResult = await Promise.resolve(
          this.apiKeyGuard.canActivate(context),
        );
        if (apiKeyResult) {
          return true;
        }
        throw new UnauthorizedException('Invalid API key');
      } catch {
        throw new UnauthorizedException('Invalid API key');
      }
    }

    const jwtResult = this.jwtAuthGuard.canActivate(context);
    if (isObservable(jwtResult)) {
      return await firstValueFrom(jwtResult);
    }
    return await Promise.resolve(jwtResult);
  }
}
