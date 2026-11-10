import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { randomBytes } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { AccountRole } from '../../accounts/account-role.js';
import { requestContext } from '../logging/request-context.js';
import type { RequestContext } from '../logging/request-context.js';
import { Public } from '../decorators/public.decorator.js';
import { JwtGuard } from './jwt.guard.js';

const secret = randomBytes(32).toString('hex');
const jwt = new JwtService({ secret });
const user = { id: 7, username: 'ali', role: AccountRole.PLANNER };

function fixture(authorization?: string, isPublic = false) {
  const request = {
    headers: authorization ? { authorization } : {},
    user: undefined,
  };
  class Resource {}
  function handler() {}
  if (isPublic) Public()(Resource.prototype, 'handler', { value: handler });
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => handler,
    getClass: () => Resource,
  } as unknown as ExecutionContext;
  return { context, request };
}

describe('JwtGuard', () => {
  let guard: JwtGuard;
  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [JwtGuard, Reflector, { provide: JwtService, useValue: jwt }],
    }).compile();
    guard = module.get(JwtGuard);
  });

  it('token olmayan korumalı isteği 401 ile reddeder', async () => {
    await expect(guard.canActivate(fixture().context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it.each(['Basic abc', 'Bearer', 'Bearer a b', 'Bearer malformed'])(
    'hatalı başlığı reddeder: %s',
    async (header) => {
      await expect(
        guard.canActivate(fixture(header).context),
      ).rejects.toMatchObject({ status: 401 });
    },
  );

  it('Public metodu token olmadan geçirir; kimlik uydurmaz', async () => {
    const { context, request } = fixture(undefined, true);
    const state: RequestContext = {
      correlationId: 'public-request',
      actor: user,
    };
    await expect(
      requestContext.run(state, () => guard.canActivate(context)),
    ).resolves.toBe(true);
    expect(request.user).toBeUndefined();
    expect(state.actor).toBeNull();
  });

  it('geçerli tokenı doğrular, kullanıcıyı request ve istek kapsamına ekler', async () => {
    const token = await jwt.signAsync(user, {
      algorithm: 'HS256',
      expiresIn: 28800,
    });
    const { context, request } = fixture(`Bearer ${token}`);
    const state: RequestContext = { correlationId: 'authenticated-request' };
    await expect(
      requestContext.run(state, () => guard.canActivate(context)),
    ).resolves.toBe(true);
    expect(request.user).toEqual(user);
    expect(state.actor).toEqual(user);
    expect(requestContext.getStore()).toBeUndefined();
  });

  it('süresi dolmuş tokenı reddeder', async () => {
    const token = await jwt.signAsync(user, {
      algorithm: 'HS256',
      expiresIn: -1,
    });
    await expect(
      guard.canActivate(fixture(`Bearer ${token}`).context),
    ).rejects.toMatchObject({ status: 401 });
  });

  it('imzası değiştirilmiş tokenı reddeder', async () => {
    const token = await jwt.signAsync(user, {
      algorithm: 'HS256',
      expiresIn: 28800,
    });
    const [header, payload, signature] = token.split('.');
    const broken = `${header}.${payload}.${signature[0] === 'a' ? 'b' : 'a'}${signature.slice(1)}`;
    await expect(
      guard.canActivate(fixture(`Bearer ${broken}`).context),
    ).rejects.toMatchObject({ status: 401 });
  });

  it('başka anahtarla imzalanmış tokenı reddeder', async () => {
    const token = await jwt.signAsync(user, {
      secret: randomBytes(32).toString('hex'),
      expiresIn: 28800,
    });
    await expect(
      guard.canActivate(fixture(`Bearer ${token}`).context),
    ).rejects.toMatchObject({ status: 401 });
  });

  it('HS256 dışındaki algoritmayı kabul etmez', async () => {
    const token = await jwt.signAsync(user, {
      algorithm: 'HS512',
      expiresIn: 28800,
    });
    await expect(
      guard.canActivate(fixture(`Bearer ${token}`).context),
    ).rejects.toMatchObject({ status: 401 });
  });

  it.each([{ id: '7' }, { id: 0 }, { username: '' }, { role: 'OWNER' }])(
    'geçersiz kullanıcı claimlerini reddeder: %j',
    async (change) => {
      const token = await jwt.signAsync(
        { ...user, ...change },
        { expiresIn: 28800 },
      );
      await expect(
        guard.canActivate(fixture(`Bearer ${token}`).context),
      ).rejects.toMatchObject({ status: 401 });
    },
  );

  it('bitiş zamanı olmayan tokenı kabul etmez', async () => {
    const token = await jwt.signAsync(user);
    await expect(
      guard.canActivate(fixture(`Bearer ${token}`).context),
    ).rejects.toMatchObject({ status: 401 });
  });

  it('kullanıcıya tokenın ek alanlarını taşımaz', async () => {
    const token = await jwt.signAsync(
      { ...user, phone: 'private-phone', passwordHash: 'private-hash' },
      { expiresIn: 28800 },
    );
    const { context, request } = fixture(`Bearer ${token}`);
    await guard.canActivate(context);
    expect(request.user).toEqual(user);
  });
});