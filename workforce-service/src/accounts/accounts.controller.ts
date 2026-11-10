import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AccountsService } from './accounts.service.js';
import type {
  CreateAccountDto,
  QueryAccountsDto,
  ValidateCredentialsDto,
} from './dto/account.dto.js';

@Controller()
export class AccountsController {
  constructor(private readonly accounts: AccountsService) {}

  @MessagePattern('createAccount')
  create(@Payload() dto: CreateAccountDto) {
    return this.accounts.create(dto);
  }

  @MessagePattern('findAllAccounts')
  findAll(@Payload() query: QueryAccountsDto) {
    return this.accounts.findAll(query);
  }

  @MessagePattern('validateCredentials')
  validateCredentials(@Payload() dto: ValidateCredentialsDto) {
    return this.accounts.validateCredentials(dto);
  }
}