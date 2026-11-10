import { Inject, Injectable } from '@nestjs/common';
import { WorkforceClient } from '../common/clients/workforce-client.js';
import type { Observable } from 'rxjs';
import type { CreateAccountDto } from './dto/create-account.dto.js';
import type { QueryAccountsDto } from './dto/query-accounts.dto.js';
import type {
  AccountResponseDto,
  AccountsPageDto,
} from './dto/account-response.dto.js';

@Injectable()
export class AccountsService {
  constructor(
    @Inject('WORKFORCE_SERVICE') private readonly client: WorkforceClient,
  ) {}
  create(dto: CreateAccountDto): Observable<AccountResponseDto> {
    return this.client.send('createAccount', dto);
  }
  findAll(query: QueryAccountsDto): Observable<AccountsPageDto> {
    return this.client.send('findAllAccounts', query);
  }
}