import { Test } from '@nestjs/testing';
import { firstValueFrom, of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

describe('AppController', () => {
  let controller: AppController;
  const service = { getHealth: vi.fn() };

  beforeEach(async () => {
    vi.resetAllMocks();
    const module = await Test.createTestingModule({
      controllers: [AppController],
      providers: [{ provide: AppService, useValue: service }],
    }).compile();
    controller = module.get(AppController);
  });

  it('health isteğini service metoduna aktarır ve pong yanıtını döndürür', async () => {
    service.getHealth.mockReturnValue(of('pong'));
    expect(await firstValueFrom(controller.getHealth())).toBe('pong');
    expect(service.getHealth).toHaveBeenCalledTimes(1);
  });

  it('bağlantı hatasını başarı yanıtına dönüştürmeden filtreye bırakır', async () => {
    const error = Object.assign(new Error('Bağlantı reddedildi'), {
      code: 'ECONNREFUSED',
    });
    service.getHealth.mockReturnValue(throwError(() => error));
    await expect(firstValueFrom(controller.getHealth())).rejects.toBe(error);
  });
});