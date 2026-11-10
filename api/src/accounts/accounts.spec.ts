import { Test } from '@nestjs/testing';
import { firstValueFrom, of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AccountRole } from './account-role.js';
import { AccountsController } from './accounts.controller.js';
import { AccountsService } from './accounts.service.js';
import { CreateAccountDto } from './dto/create-account.dto.js';
import { QueryAccountsDto } from './dto/query-accounts.dto.js';

describe('Accounts API', () => {
  const client = { send: vi.fn() };
  let controller: AccountsController;
  beforeEach(async () => {
    vi.resetAllMocks();
    client.send.mockReturnValue(
      of({ id: 1, username: 'ali', role: AccountRole.VIEWER }),
    );
    const module = await Test.createTestingModule({
      controllers: [AccountsController],
      providers: [
        AccountsService,
        { provide: 'WORKFORCE_SERVICE', useValue: client },
      ],
    }).compile();
    controller = module.get(AccountsController);
  });
  it('oluşturma verisini createAccount pattern’ine gönderir', async () => {
    const dto = {
      username: 'ali',
      password: 'test-only-password',
      role: AccountRole.VIEWER,
    };
    await firstValueFrom(controller.create(dto));
    expect(client.send).toHaveBeenCalledWith('createAccount', dto);
  });
  it('liste filtrelerini findAllAccounts pattern’ine gönderir', async () => {
    await firstValueFrom(controller.findAll({ page: 2, limit: 5 }));
    expect(client.send).toHaveBeenCalledWith('findAllAccounts', {
      page: 2,
      limit: 5,
    });
  });
});

describe('CreateAccountDto', () => {
  const valid = {
    username: ' Ali ',
    password: 'test-only-password',
    role: AccountRole.PLANNER,
  };
  it('geçerli veriyi doğrular ve kullanıcı adını normalize eder', async () => {
    const dto = plainToInstance(CreateAccountDto, valid);
    expect(await validate(dto)).toEqual([]);
    expect(dto.username).toBe('ali');
  });
  it.each([
    { username: '' },
    { username: '  ' },
    { username: 'a'.repeat(51) },
    { username: 7 },
    { password: 'short' },
    { password: ' '.repeat(8) },
    { password: 'a'.repeat(73) },
    { password: 'ü'.repeat(37) },
    { password: null },
    { role: 'OWNER' },
  ])('geçersiz alanı reddeder: %j', async (change) => {
    expect(
      (
        await validate(
          plainToInstance(CreateAccountDto, { ...valid, ...change }),
        )
      ).length,
    ).toBeGreaterThan(0);
  });
  it('izin verilmeyen passwordHash ve isActive alanlarını whitelist ile atar', async () => {
    const dto = plainToInstance(CreateAccountDto, {
      ...valid,
      passwordHash: 'injected',
      isActive: false,
    });
    expect(await validate(dto, { whitelist: true })).toEqual([]);
    expect(dto).not.toHaveProperty('passwordHash');
    expect(dto).not.toHaveProperty('isActive');
  });
  it('72 byte sınırını kabul eder', async () => {
    expect(
      await validate(
        plainToInstance(CreateAccountDto, {
          ...valid,
          password: 'ü'.repeat(36),
        }),
      ),
    ).toEqual([]);
  });
});

describe('QueryAccountsDto', () => {
  it('query metinlerini sayıya ve boolean’a dönüştürür', async () => {
    const dto = plainToInstance(QueryAccountsDto, {
      page: '2',
      limit: '5',
      isActive: 'false',
      search: 'ali',
    });
    expect(await validate(dto)).toEqual([]);
    expect(dto).toMatchObject({ page: 2, limit: 5, isActive: false });
  });
  it.each([{ page: '0' }, { limit: '101' }, { isActive: 'invalid' }])(
    'geçersiz query reddedilir: %j',
    async (value) => {
      expect(
        (await validate(plainToInstance(QueryAccountsDto, value))).length,
      ).toBeGreaterThan(0);
    },
  );
});