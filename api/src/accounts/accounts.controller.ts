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
@Controller('accounts')
export class AccountsController {
  constructor(private readonly accounts: AccountsService) {}

  @Post()
  @ApiOperation({
    summary: 'Hesap oluşturur',
    description: 'Rol kontrolü henüz etkin değildir.',
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
  @ApiOperation({
    summary: 'Hesapları sayfalı listeler',
    description:
      'Şifre ve hash alanları yanıtta bulunmaz. Rol kontrolü henüz etkin değildir.',
  })
  @ApiOkResponse({ type: AccountsPageDto })
  @ApiBadRequestResponse({ description: 'Sayfalama veya filtre geçersiz' })
  findAll(@Query() query: QueryAccountsDto) {
    return this.accounts.findAll(query);
  }
}