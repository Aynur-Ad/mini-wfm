import { Test, TestingModule } from '@nestjs/testing';
import { vi } from 'vitest';
import { WorkforceUsersController } from './workforce_users.controller.js';
import { WorkforceUsersService } from './workforce_users.service.js';

describe('WorkforceUsersController', () => {
  let controller: WorkforceUsersController;

  const mockWorkforceUsersService = {
    create: vi.fn(),
    findAll: vi.fn(),
    findOne: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorkforceUsersController],
      providers: [
        {
          provide: WorkforceUsersService,
          useValue: mockWorkforceUsersService,
        },
      ],
    }).compile();

    controller = module.get<WorkforceUsersController>(WorkforceUsersController);
  });

  it('controller tanımlı olmalıdır', () => {
    expect(controller).toBeDefined();
  });
});
