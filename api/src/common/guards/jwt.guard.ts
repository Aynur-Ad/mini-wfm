import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { requestContext } from '../logging/request-context.js';
import { readAuthUser } from '../../auth/auth-user.js';
import type { AuthenticatedRequest } from '../../auth/auth-user.js';
import { JWT_ALGORITHM } from '../../auth/auth.constants.js';

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const state = requestContext.getStore();
    // Kimlik yalnızca doğrulanmış token'dan alınır; body/query üzerinden okunmaz.
    request.user = undefined;
    if (state) state.actor = null;

    if (
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ])
    )
      return true;
    const header = request.headers.authorization;
    const match =
      typeof header === 'string' ? /^Bearer ([^\s]+)$/i.exec(header) : null;
    if (!match)
      throw new UnauthorizedException('Geçerli bir Bearer token gereklidir');

    try {
      const payload = await this.jwt.verifyAsync<Record<string, unknown>>(
        match[1],
        { algorithms: [JWT_ALGORITHM] },
      );
      const user = readAuthUser(payload);
      if (
        !user ||
        typeof payload.exp !== 'number' ||
        !Number.isInteger(payload.exp)
      ) {
        throw new Error('Geçersiz token içeriği');
      }
      request.user = user;
      if (state) state.actor = user;
      return true;
    } catch {
      // İmza/expiry ayrıntıları ve token loglanmaz veya yanıta eklenmez.
      throw new UnauthorizedException('Token geçersiz veya süresi dolmuş');
    }
  }
}