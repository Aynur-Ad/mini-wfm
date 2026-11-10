import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';
import { AccountRole } from '../../accounts/account-role.js';
import { Public } from '../decorators/public.decorator.js';
import { Roles, ROLES_KEY } from '../decorators/roles.decorator.js';
import { RolesGuard } from './roles.guard.js';

function fixture(
  role?: AccountRole,
  controllerRoles?: AccountRole[],
  methodRoles?: AccountRole[],
  isPublic = false,
) {
  class Resource {
    handler(this: void) {}
  }
  if (controllerRoles) Roles(...controllerRoles)(Resource);
  const descriptor = Object.getOwnPropertyDescriptor(
    Resource.prototype,
    'handler',
  )!;
  if (methodRoles)
    Roles(...methodRoles)(Resource.prototype, 'handler', descriptor);
  if (isPublic) Public()(Resource.prototype, 'handler', descriptor);
  const request = {
    user: role ? { id: 1, username: 'test', role } : undefined,
    body: { role: AccountRole.ADMIN, actor: { role: AccountRole.ADMIN } },
    query: { role: AccountRole.ADMIN },
    headers: { role: AccountRole.ADMIN },
  };
  const context = {
    getClass: () => Resource,
    getHandler: () => Resource.prototype.handler,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return context;
}

const guard = new RolesGuard(new Reflector());

describe('RolesGuard', () => {
  it('kimlik yoksa 403 yerine 401 verir', () => {
    expect(() => guard.canActivate(fixture())).toThrow(UnauthorizedException);
  });

  it('Public endpointi token ve rol olmadan geçirir', () => {
    expect(
      guard.canActivate(
        fixture(undefined, [AccountRole.ADMIN], undefined, true),
      ),
    ).toBe(true);
  });

  it.each(Object.values(AccountRole))(
    'açık okuma izninde %s rolünü geçirir',
    (role) => {
      expect(
        guard.canActivate(fixture(role, undefined, Object.values(AccountRole))),
      ).toBe(true);
    },
  );

  it('metadata yoksa admin geçer', () => {
    expect(guard.canActivate(fixture(AccountRole.ADMIN))).toBe(true);
  });

  it.each([AccountRole.VIEWER, AccountRole.PLANNER])(
    'metadata yoksa %s reddedilir; body/query/header izin vermez',
    (role) => {
      expect(() => guard.canActivate(fixture(role))).toThrow(
        'Bu işlem için yetkiniz yok',
      );
      try {
        guard.canActivate(fixture(role));
      } catch (error) {
        expect(error).toMatchObject({
          status: 403,
          response: { message: 'Bu işlem için yetkiniz yok' },
        });
      }
    },
  );

  it('controller rol listesini okur', () => {
    expect(
      guard.canActivate(
        fixture(AccountRole.PLANNER, [AccountRole.PLANNER, AccountRole.ADMIN]),
      ),
    ).toBe(true);
  });

  it('metot listesi controller listesinin yerini alır; listeler birleştirilmez', () => {
    const parent = Object.values(AccountRole);
    expect(() =>
      guard.canActivate(
        fixture(AccountRole.VIEWER, parent, [AccountRole.ADMIN]),
      ),
    ).toThrow('Bu işlem için yetkiniz yok');
    expect(
      guard.canActivate(
        fixture(AccountRole.VIEWER, [AccountRole.ADMIN], parent),
      ),
    ).toBe(true);
  });

  it('boş rol listesi herkesi reddeder', () => {
    expect(() =>
      guard.canActivate(fixture(AccountRole.ADMIN, undefined, [])),
    ).toThrow('Bu işlem için yetkiniz yok');
  });

  it('Roles dekoratörü rollerin metadata bilgisini yazar', () => {
    const context = fixture(AccountRole.ADMIN, undefined, [AccountRole.ADMIN]);
    expect(new Reflector().get(ROLES_KEY, context.getHandler())).toEqual([
      AccountRole.ADMIN,
    ]);
  });
});