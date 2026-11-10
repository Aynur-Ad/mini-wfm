import { Roles } from '../common/decorators/roles.decorator.js';
import { AccountRole } from '../accounts/account-role.js';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthUser } from './auth-user.js';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { AuthUserDto, LoginResponseDto } from './dto/login-response.dto.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Giriş yapar ve 8 saatlik erişim token’ı verir',
    description: 'Herkese açık; token gerekmez.',
  })
  @ApiOkResponse({ type: LoginResponseDto })
  @ApiBadRequestResponse({ description: 'İstek gövdesi geçersiz' })
  @ApiUnauthorizedResponse({ description: 'Kullanıcı adı veya şifre hatalı' })
  @ApiServiceUnavailableResponse({
    description: 'Workforce-service kullanılamıyor',
  })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Get('me')
  @Roles(AccountRole.ADMIN, AccountRole.PLANNER, AccountRole.VIEWER)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Token sahibinin kimliğini döndürür',
    description: 'İzin verilen roller: ADMIN, PLANNER, VIEWER.',
  })
  @ApiOkResponse({ type: AuthUserDto })
  @ApiUnauthorizedResponse({
    description: 'Token yok, geçersiz veya süresi dolmuş',
  })
  me(@CurrentUser() user: AuthUser): AuthUser {
    return user;
  }
}