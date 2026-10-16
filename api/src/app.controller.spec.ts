import { Test, TestingModule } from '@nestjs/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { AppController } from './app.controller.js';

describe('AppController', () => {
  let appController: AppController;

  const mockWorkforceClient = {
    send: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: 'WORKFORCE_SERVICE',
          useValue: mockWorkforceClient,
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('getHealth', () => {
    it('workforce-service ping mesajını gönderir', () => {
      mockWorkforceClient.send.mockReturnValue(of('pong'));

      appController.getHealth();

      expect(mockWorkforceClient.send).toHaveBeenCalledWith('ping', {});
    });
  });
});
