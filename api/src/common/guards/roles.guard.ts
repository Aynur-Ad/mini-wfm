import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AccountRole } from '../../accounts/account-role.js';
import type { AuthenticatedRequest } from '../../auth/auth-user.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { ROLES_KEY } from '../decorators/roles.decorator.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) {
      return true;
    }

    // JwtGuard önce çalışır. Body/query/header içindeki rol alanları okunmaz.
    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!user) {
      throw new UnauthorizedException('Geçerli bir Bearer token gereklidir');
    }

    // P6: açık izin tanımı yoksa endpoint yalnızca admin'e açıktır.
    const allowed = this.reflector.getAllAndOverride<AccountRole[]>(
      ROLES_KEY,
      targets,
    ) ?? [AccountRole.ADMIN];

    if (!allowed.includes(user.role)) {
      throw new ForbiddenException('Bu işlem için yetkiniz yok');
    }
    return true;
  }
}