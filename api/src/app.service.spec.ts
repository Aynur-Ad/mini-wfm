import { Test } from '@nestjs/testing';
import { firstValueFrom, of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { AppService } from './app.service.js';

describe('AppService', () => {
  let service: AppService;
  const client = { send: vi.fn() };

  beforeEach(async () => {
    vi.resetAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        AppService,
        { provide: 'WORKFORCE_SERVICE', useValue: client },
      ],
    }).compile();
    service = module.get(AppService);
  });

  it('ping mesajını boş veriyle gönderir ve pong yanıtını korur', async () => {
    client.send.mockReturnValue(of('pong'));
    expect(await firstValueFrom(service.getHealth())).toBe('pong');
    expect(client.send).toHaveBeenCalledWith('ping', {});
  });

  it('TCP bağlantı hatasını değiştirmeden iletir', async () => {
    const error = Object.assign(new Error('Bağlantı reddedildi'), {
      code: 'ECONNREFUSED',
    });
    client.send.mockReturnValue(throwError(() => error));
    await expect(firstValueFrom(service.getHealth())).rejects.toBe(error);
  });
});