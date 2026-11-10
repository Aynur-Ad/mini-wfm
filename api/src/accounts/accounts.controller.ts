import { Roles } from '../common/decorators/roles.decorator.js';
import { AccountRole } from './account-role.js';
import {
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AccountsService } from './accounts.service.js';
import { CreateAccountDto } from './dto/create-account.dto.js';
import { QueryAccountsDto } from './dto/query-accounts.dto.js';
import {
  AccountResponseDto,
  AccountsPageDto,
} from './dto/account-response.dto.js';

@ApiTags('Accounts')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({
  description: 'Token yok, geçersiz veya süresi dolmuş',
})
@ApiForbiddenResponse({ description: 'Bu işlem için yetkiniz yok' })
@Controller('accounts')
export class AccountsController {
  constructor(private readonly accounts: AccountsService) {}

  @Post()
  @Roles(AccountRole.ADMIN)
  @ApiOperation({
    summary: 'Hesap oluşturur',
    description: 'İzin verilen roller: ADMIN.',
  })
  @ApiCreatedResponse({ type: AccountResponseDto })
  @ApiBadRequestResponse({
    description: 'Kullanıcı adı, şifre veya rol geçersiz',
  })
  @ApiConflictResponse({ description: 'Kullanıcı adı zaten kayıtlı' })
  create(@Body() dto: CreateAccountDto) {
    return this.accounts.create(dto);
  }

  @Get()
  @Roles(AccountRole.ADMIN)
  @ApiOperation({
    summary: 'Hesapları sayfalı listeler',
    description:
      'Şifre ve hash alanları yanıtta bulunmaz. İzin verilen roller: ADMIN.',
  })
  @ApiOkResponse({ type: AccountsPageDto })
  @ApiBadRequestResponse({ description: 'Sayfalama veya filtre geçersiz' })
  findAll(@Query() query: QueryAccountsDto) {
    return this.accounts.findAll(query);
  }
}