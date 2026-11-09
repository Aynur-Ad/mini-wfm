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
        data,
      });
    },
  );
  it('HTTP isteği dışındaki çağrı için yeni kimlik üretir', () => {
    const send = vi.fn().mockReturnValue(of('ok'));
    new WorkforceClient({ send } as unknown as ClientProxy).send('ping', {});
    expect(send.mock.calls[0][1].correlationId).toMatch(/^[0-9a-f-]{36}$/);
  });
});