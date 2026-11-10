import { AccountRole } from '../../accounts/account-role.js';
import type { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { WorkforceClient } from './workforce-client.js';
import { requestContext } from '../logging/request-context.js';

describe('WorkforceClient', () => {
  it.each([
    ['ping', {}],
    ['findOneTeam', 1],
    ['createTeam', { name: 'Ekip' }],
  ])(
    '%s mesajının verisini değiştirmeden aynı kimlikle sarar',
    async (pattern, data) => {
      const send = vi.fn().mockReturnValue(of('ok'));
      const client = new WorkforceClient({ send } as unknown as ClientProxy);
      const result = requestContext.run({ correlationId: 'same-request' }, () =>
        client.send(pattern as string, data),
      );
      await expect(firstValueFrom(result)).resolves.toBe('ok');
      expect(send).toHaveBeenCalledWith(pattern, {
        correlationId: 'same-request',
        actor: null,
        data,
      });
    },
  );
  it('HTTP isteği dışındaki çağrı için yeni kimlik üretir', () => {
    const send = vi.fn().mockReturnValue(of('ok'));
    new WorkforceClient({ send } as unknown as ClientProxy).send('ping', {});
    expect(send.mock.calls[0][1].correlationId).toMatch(/^[0-9a-f-]{36}$/);
  });
  it('aynı kimlikle yalnızca doğrulanmış actor bilgisini taşır', () => {
    const send = vi.fn().mockReturnValue(of('ok'));
    const actor = { id: 7, username: 'ali', role: AccountRole.PLANNER };
    const client = new WorkforceClient({ send } as unknown as ClientProxy);
    requestContext.run({ correlationId: 'actor-request', actor }, () =>
      client.send('findAllTeams', { actor: { id: 999 }, token: 'body-value' }),
    );
    expect(send.mock.calls[0][1]).toMatchObject({
      correlationId: 'actor-request',
      actor,
    });
    expect(send.mock.calls[0][1].actor.id).toBe(7);
    expect(send.mock.calls[0][1]).not.toHaveProperty('token');
  });
});