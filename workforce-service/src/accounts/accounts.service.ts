import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RpcException } from '@nestjs/microservices';
import { ILike, Repository } from 'typeorm';
import type { FindOptionsWhere } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Account } from './entities/account.entity.js';
import type {
  CreateAccountDto,
  QueryAccountsDto,
  ValidateCredentialsDto,
  AccountResponse,
} from './dto/account.dto.js';
import { isValidPassword, normalizeUsername } from './password-policy.js';

// Kullanıcı bulunamadığında da gerçek bcrypt karşılaştırması yapılır. Bu hash bir hesap şifresi değildir.
const DUMMY_HASH =
  '$2b$12$cCvt3yUVOlK2ZAVRKYdU3.yCCoOC3kNh7JWA39RmGnQF617xGSiXC';

function publicAccount(account: Account): AccountResponse {
  // Entity'yi spread ile döndürmeyiz: seçilmiş olsa bile passwordHash dışarı çıkmaz.
  return {
    id: account.id,
    username: account.username,
    role: account.role,
    isActive: account.isActive,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
  };
}

@Injectable()
export class AccountsService {
  constructor(
    @InjectRepository(Account) private readonly accounts: Repository<Account>,
  ) {}

  async create(dto: CreateAccountDto): Promise<AccountResponse> {
    const username = normalizeUsername(dto.username);
    if (!username || username.length > 50 || !isValidPassword(dto.password)) {
      throw new RpcException({
        statusCode: 400,
        message: 'Kullanıcı adı veya şifre kurallara uygun değil',
      });
    }
    if (await this.accounts.findOneBy({ username })) this.conflict();
    const passwordHash = await bcrypt.hash(dto.password, 12);
    try {
      const saved = await this.accounts.save(
        this.accounts.create({ username, passwordHash, role: dto.role }),
      );
      return publicAccount(saved);
    } catch (error) {
      // İki eşzamanlı istek ön kontrolden geçse de DB unique kısıtı korunur.
      if (
        typeof error === 'object' &&
        error !== null &&
        'driverError' in error
      ) {
        const driver: unknown = error.driverError;
        if (
          typeof driver === 'object' &&
          driver !== null &&
          'code' in driver &&
          driver.code === '23505'
        )
          this.conflict();
      }
      throw error;
    }
  }

  async findAll(query: QueryAccountsDto = {}) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const where: FindOptionsWhere<Account> = {};
    if (query.search?.trim())
      where.username = ILike(`%${query.search.trim()}%`);
    if (query.isActive !== undefined) where.isActive = query.isActive;
    const [accounts, total] = await this.accounts.findAndCount({
      where,
      order: { createdAt: 'DESC', id: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data: accounts.map(publicAccount), total, page, limit };
  }

  async validateCredentials(
    dto: ValidateCredentialsDto,
  ): Promise<AccountResponse> {
    const account = await this.accounts.findOne({
      where: { username: normalizeUsername(dto.username) },
      select: {
        id: true,
        username: true,
        passwordHash: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    const password = typeof dto.password === 'string' ? dto.password : '';
    const matches = await bcrypt.compare(
      password,
      account?.passwordHash ?? DUMMY_HASH,
    );
    if (
      !account ||
      !account.isActive ||
      !isValidPassword(password) ||
      !matches
    ) {
      throw new RpcException({
        statusCode: 401,
        message: 'Kullanıcı adı veya şifre hatalı',
      });
    }
    return publicAccount(account);
  }

  private conflict(): never {
    throw new RpcException({
      statusCode: 409,
      message: 'Bu kullanıcı adıyla kayıtlı bir hesap zaten var',
    });
  }
}