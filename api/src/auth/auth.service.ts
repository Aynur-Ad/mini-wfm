import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { firstValueFrom } from 'rxjs';
import { WorkforceClient } from '../common/clients/workforce-client.js';
import { readAuthUser } from './auth-user.js';
import { ACCESS_TOKEN_TTL_SECONDS, JWT_ALGORITHM } from './auth.constants.js';
import type { LoginDto } from './dto/login.dto.js';
import type { LoginResponseDto } from './dto/login-response.dto.js';

function credentialsRejected(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  if ('statusCode' in error && error.statusCode === 401) return true;
  return (
    'error' in error &&
    typeof error.error === 'object' &&
    error.error !== null &&
    'statusCode' in error.error &&
    error.error.statusCode === 401
  );
}

@Injectable()
export class AuthService {
  constructor(
    @Inject('WORKFORCE_SERVICE') private readonly workforce: WorkforceClient,
    private readonly jwt: JwtService,
  ) {}

  async login(dto: LoginDto): Promise<LoginResponseDto> {
    let account: unknown;
    try {
      account = await firstValueFrom(
        this.workforce.send<unknown>('validateCredentials', dto),
      );
    } catch (error) {
      if (credentialsRejected(error))
        throw new UnauthorizedException('Kullanıcı adı veya şifre hatalı');
      // Bağlantı hataları mevcut filter tarafından 503'e çevrilir; 401 ile karıştırılmaz.
      throw error;
    }
    const user = readAuthUser(account);
    if (
      !user ||
      typeof account !== 'object' ||
      account === null ||
      !('isActive' in account) ||
      account.isActive !== true
    ) {
      throw new UnauthorizedException('Kullanıcı adı veya şifre hatalı');
    }
    const accessToken = await this.jwt.signAsync(user, {
      algorithm: JWT_ALGORITHM,
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    });
    return { accessToken, expiresIn: ACCESS_TOKEN_TTL_SECONDS, user };
  }
}