import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { randomBytes } from 'node:crypto';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AccountRole } from '../accounts/account-role.js';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { ACCESS_TOKEN_TTL_SECONDS } from './auth.constants.js';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { LoginDto } from './dto/login.dto.js';

const secret = randomBytes(32).toString('hex');
const jwt = new JwtService({ secret });
const user = { id: 7, username: 'ali', role: AccountRole.PLANNER };
const dto = { username: 'ali', password: 'test-only-password' };

describe('AuthService ve AuthController', () => {
  const client = { send: vi.fn() };
  let service: AuthService;
  let controller: AuthController;
  beforeEach(async () => {
    vi.resetAllMocks();
    const module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        AuthService,
        { provide: 'WORKFORCE_SERVICE', useValue: client },
        { provide: JwtService, useValue: jwt },
      ],
    }).compile();
    service = module.get(AuthService);
    controller = module.get(AuthController);
  });

  it('doğrulanmış hesaba 8 saatlik token verir; şifre/hash payload ve yanıtta yoktur', async () => {
    client.send.mockReturnValue(
      of({
        ...user,
        isActive: true,
        password: 'private-password',
        passwordHash: 'private-hash',
        createdAt: 'private-date',
      }),
    );
    const result = await controller.login(dto);
    expect(client.send).toHaveBeenCalledWith('validateCredentials', dto);
    expect(result.user).toEqual(user);
    expect(result.expiresIn).toBe(ACCESS_TOKEN_TTL_SECONDS);
    const payload = await jwt.verifyAsync<Record<string, unknown>>(
      result.accessToken,
    );
    expect(payload).toMatchObject(user);
    expect(Object.keys(payload).sort()).toEqual([
      'exp',
      'iat',
      'id',
      'role',
      'username',
    ]);
    expect(Number(payload.exp) - Number(payload.iat)).toBe(28800);
    expect(JSON.stringify(result)).not.toMatch(
      /private-password|private-hash|private-date/,
    );
  });

  it.each([
    { statusCode: 401, message: 'internal' },
    { error: { statusCode: 401, message: 'internal' } },
  ])('kimlik doğrulama hatasını tek mesajla döndürür: %j', async (error) => {
    client.send.mockReturnValue(throwError(() => error));
    await expect(service.login(dto)).rejects.toMatchObject({
      status: 401,
      response: { message: 'Kullanıcı adı veya şifre hatalı' },
    });
  });

  it('pasif hesabı reddeder', async () => {
    client.send.mockReturnValue(of({ ...user, isActive: false }));
    await expect(service.login(dto)).rejects.toMatchObject({
      status: 401,
      response: { message: 'Kullanıcı adı veya şifre hatalı' },
    });
  });

  it('bağlantı hatasını 401 olarak gizlemez', async () => {
    const error = Object.assign(new Error('connect failed'), {
      code: 'ECONNREFUSED',
    });
    client.send.mockReturnValue(throwError(() => error));
    await expect(service.login(dto)).rejects.toBe(error);
  });

  it('me, guard’ın verdiği güvenli kullanıcıyı döndürür', () => {
    expect(controller.me(user)).toEqual(user);
  });
});

describe('LoginDto', () => {
  it('kullanıcı adını normalize eder, şifreyi değiştirmez', async () => {
    const value = plainToInstance(LoginDto, {
      username: ' ALI ',
      password: ' password-with-spaces ',
    });
    expect(await validate(value)).toEqual([]);
    expect(value.username).toBe('ali');
    expect(value.password).toBe(' password-with-spaces ');
  });
  it.each([
    { username: '' },
    { username: 'a'.repeat(51) },
    { password: '' },
    { password: 'a'.repeat(73) },
  ])('geçersiz gövdeyi reddeder: %j', async (change) => {
    expect(
      (await validate(plainToInstance(LoginDto, { ...dto, ...change }))).length,
    ).toBeGreaterThan(0);
  });
  it('body üzerinden user/actor enjekte edilmesini whitelist ile engeller', async () => {
    const value = plainToInstance(LoginDto, { ...dto, actor: user, user });
    expect(await validate(value, { whitelist: true })).toEqual([]);
    expect(value).not.toHaveProperty('actor');
    expect(value).not.toHaveProperty('user');
  });
});