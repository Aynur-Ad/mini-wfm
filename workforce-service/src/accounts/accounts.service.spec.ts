import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import * as bcrypt from 'bcrypt';
import { Account } from './entities/account.entity.js';
import { AccountRole } from './account-role.js';
import { AccountsService } from './accounts.service.js';

const password = 'unit-test-account-password';
let passwordHash: string;
beforeAll(async () => {
  passwordHash = await bcrypt.hash(password, 12);
});

function fixture(): Account {
  return Object.assign(new Account(), {
    id: 1,
    username: 'ali',
    passwordHash,
    role: AccountRole.VIEWER,
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  });
}

describe('AccountsService', () => {
  let service: AccountsService;
  const repository = {
    findOneBy: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
    findAndCount: vi.fn(),
    findOne: vi.fn(),
  };
  beforeEach(async () => {
    vi.resetAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        AccountsService,
        {
          provide: getRepositoryToken(Account),
          useValue: repository,
        },
      ],
    }).compile();
    service = module.get(AccountsService);
  });

  it('kullanıcı adını normalize eder, bcrypt hash saklar ve gizli alanları döndürmez', async () => {
    repository.findOneBy.mockResolvedValue(null);
    repository.create.mockImplementation((value: object) =>
      Object.assign(new Account(), value),
    );
    repository.save.mockImplementation((value: Account) =>
      Promise.resolve(Object.assign(fixture(), value)),
    );
    const result = await service.create({
      username: ' Ali ',
      password,
      role: AccountRole.VIEWER,
    });
    expect(repository.findOneBy).toHaveBeenCalledWith({ username: 'ali' });
    const saved = repository.create.mock.calls[0][0] as Account;
    expect(saved.passwordHash).toMatch(/^\$2b\$12\$/);
    expect(await bcrypt.compare(password, saved.passwordHash)).toBe(true);
    expect(saved).not.toHaveProperty('password');
    expect(result.username).toBe('ali');
    expect(result).not.toHaveProperty('password');
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('Ali/ali çakışmasında 409 verir ve kayıt yazmaz', async () => {
    repository.findOneBy.mockResolvedValue(fixture());
    await expect(
      service.create({ username: 'Ali', password, role: AccountRole.VIEWER }),
    ).rejects.toMatchObject({ error: { statusCode: 409 } });
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('eşzamanlı create sırasında DB unique hatasını da 409 yapar', async () => {
    repository.findOneBy.mockResolvedValue(null);
    repository.create.mockReturnValue(fixture());
    repository.save.mockRejectedValue({ driverError: { code: '23505' } });
    await expect(
      service.create({ username: 'Ali', password, role: AccountRole.ADMIN }),
    ).rejects.toMatchObject({ error: { statusCode: 409 } });
  });

  it.each(['short', ' '.repeat(8), 'a'.repeat(73), 'ü'.repeat(37)])(
    'geçersiz şifreyi DB yazmadan reddeder: %s',
    async (invalid) => {
      await expect(
        service.create({
          username: 'ali',
          password: invalid,
          role: AccountRole.VIEWER,
        }),
      ).rejects.toMatchObject({ error: { statusCode: 400 } });
      expect(repository.save).not.toHaveBeenCalled();
    },
  );

  it('liste şifre/hash içermeden P2 sayfalama biçiminde döner', async () => {
    repository.findAndCount.mockResolvedValue([[fixture()], 7]);
    const result = await service.findAll({ page: 2, limit: 2 });
    expect(repository.findAndCount).toHaveBeenCalledWith({
      where: {},
      order: { createdAt: 'DESC', id: 'DESC' },
      skip: 2,
      take: 2,
    });
    expect(result).toMatchObject({ total: 7, page: 2, limit: 2 });
    expect(result.data[0]).not.toHaveProperty('passwordHash');
  });

  it('doğru şifreyle güvenli hesap bilgisini döner', async () => {
    repository.findOne.mockResolvedValue(fixture());
    const result = await service.validateCredentials({
      username: ' ALI ',
      password,
    });
    expect(repository.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: { username: 'ali' } }),
    );
    expect(result).toMatchObject({ id: 1, username: 'ali' });
    expect(result).not.toHaveProperty('passwordHash');
  });

  it.each(['missing', 'wrong-password', 'inactive'])(
    '%s durumu aynı 401 mesajını verir',
    async (scenario) => {
      const account = fixture();
      if (scenario === 'inactive') account.isActive = false;
      repository.findOne.mockResolvedValue(
        scenario === 'missing' ? null : account,
      );
      await expect(
        service.validateCredentials({
          username: 'ali',
          password: scenario === 'wrong-password' ? 'wrong-password' : password,
        }),
      ).rejects.toMatchObject({
        error: { statusCode: 401, message: 'Kullanıcı adı veya şifre hatalı' },
      });
    },
  );
});