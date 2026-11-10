import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';
import * as bcrypt from 'bcrypt';
import type { Repository } from 'typeorm';
import { Account } from '../accounts/entities/account.entity.js';
import { AccountRole } from '../accounts/account-role.js';
import { AccountsService } from '../accounts/accounts.service.js';
import { startPostgresTestDatabase } from './postgres-test.helper.js';
import type { PostgresTestDatabase } from './postgres-test.helper.js';

describe('AccountsService — gerçek PostgreSQL', () => {
  let database: PostgresTestDatabase | undefined;
  let module: TestingModule | undefined;
  let accounts: Repository<Account>;
  let service: AccountsService;
  const password = 'integration-test-account-password';

  beforeAll(async () => {
    database = await startPostgresTestDatabase();
    accounts = database.dataSource.getRepository(Account);
    module = await Test.createTestingModule({
      providers: [
        AccountsService,
        { provide: getRepositoryToken(Account), useValue: accounts },
      ],
    }).compile();
    service = module.get(AccountsService);
  });
  beforeEach(async () => {
    // Seed her testin başlangıcında vardır; önceki testin hesapları kalmaz.
    expect(await accounts.count()).toBe(1);
  });
  afterEach(async () => {
    await database?.clean();
  });
  afterAll(async () => {
    try {
      await module?.close();
    } finally {
      await database?.stop();
    }
  });

  it('seed migration ilk admin’i hash ile oluşturur ve normal sorgu hash döndürmez', async () => {
    if (!database) throw new Error('Test veritabanı hazırlanmadı');
    const normal = await accounts.findOneByOrFail({
      username: database.initialAdmin.username,
    });
    expect(normal.role).toBe(AccountRole.ADMIN);
    expect(normal.passwordHash).toBeUndefined();
    const selected = await accounts.findOneOrFail({
      where: { id: normal.id },
      select: { id: true, passwordHash: true },
    });
    expect(selected.passwordHash).toMatch(/^\$2b\$12\$/);
    expect(
      await bcrypt.compare(
        database.initialAdmin.password,
        selected.passwordHash,
      ),
    ).toBe(true);
  });

  it('create ve list yanıtları şifre/hash içermez, DB’de hash saklanır', async () => {
    const created = await service.create({
      username: ' Ali ',
      password,
      role: AccountRole.PLANNER,
    });
    expect(created.username).toBe('ali');
    expect(created).not.toHaveProperty('password');
    expect(created).not.toHaveProperty('passwordHash');
    const stored = await accounts.findOneOrFail({
      where: { id: created.id },
      select: { id: true, passwordHash: true },
    });
    expect(await bcrypt.compare(password, stored.passwordHash)).toBe(true);
    const page = await service.findAll();
    expect(page.total).toBe(2);
    for (const account of page.data) {
      expect(account).not.toHaveProperty('password');
      expect(account).not.toHaveProperty('passwordHash');
    }
  });

  it('Ali ve ali aynı kullanıcı adı sayılır', async () => {
    await service.create({
      username: 'Ali',
      password,
      role: AccountRole.VIEWER,
    });
    await expect(
      service.create({ username: 'ali', password, role: AccountRole.ADMIN }),
    ).rejects.toMatchObject({ error: { statusCode: 409 } });
    expect(await accounts.count()).toBe(2);
  });

  it('doğrudan repository yazmasında DB unique kısıtı çalışır', async () => {
    const created = await service.create({
      username: 'ali',
      password,
      role: AccountRole.VIEWER,
    });
    const stored = await accounts.findOneOrFail({
      where: { id: created.id },
      select: { passwordHash: true },
    });
    await expect(
      accounts.insert({
        username: 'ali',
        passwordHash: stored.passwordHash,
        role: AccountRole.ADMIN,
      }),
    ).rejects.toMatchObject({ driverError: { code: '23505' } });
  });

  it('DB kullanıcı adının küçük harf olmasını da zorunlu tutar', async () => {
    const hash = await bcrypt.hash(password, 12);
    await expect(
      accounts.insert({
        username: 'Ali',
        passwordHash: hash,
        role: AccountRole.VIEWER,
      }),
    ).rejects.toMatchObject({ driverError: { code: '23514' } });
  });

  it('doğru şifreyi doğrular, hash içermeyen hesap bilgisi döndürür', async () => {
    await service.create({
      username: 'ali',
      password,
      role: AccountRole.VIEWER,
    });
    const result = await service.validateCredentials({
      username: 'ALI',
      password,
    });
    expect(result.username).toBe('ali');
    expect(result).not.toHaveProperty('passwordHash');
  });

  it.each(['missing', 'wrong-password', 'inactive'])(
    '%s aynı 401 mesajını döndürür',
    async (scenario) => {
      const created = await service.create({
        username: 'ali',
        password,
        role: AccountRole.VIEWER,
      });
      if (scenario === 'inactive')
        await accounts.update(created.id, { isActive: false });
      await expect(
        service.validateCredentials({
          username: scenario === 'missing' ? 'nobody' : 'ali',
          password: scenario === 'wrong-password' ? 'wrong-password' : password,
        }),
      ).rejects.toMatchObject({
        error: { statusCode: 401, message: 'Kullanıcı adı veya şifre hatalı' },
      });
    },
  );

  it('arama, aktiflik ve sayfalama total hesabı birlikte çalışır', async () => {
    await service.create({
      username: 'user_a',
      password,
      role: AccountRole.VIEWER,
    });
    const second = await service.create({
      username: 'user_b',
      password,
      role: AccountRole.PLANNER,
    });
    await accounts.update(second.id, { isActive: false });
    const result = await service.findAll({
      search: 'USER_',
      isActive: true,
      page: 1,
      limit: 1,
    });
    expect(result.total).toBe(1);
    expect(result.data.map((account) => account.username)).toEqual(['user_a']);
  });
});