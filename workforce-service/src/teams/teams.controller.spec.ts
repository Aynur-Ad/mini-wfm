import { Test, TestingModule } from '@nestjs/testing';
import { vi } from 'vitest';
import { TeamsController } from './teams.controller.js';
import { TeamsService } from './teams.service.js';

describe('TeamsController', () => {
  let controller: TeamsController;

  const mockTeamsService = {
    create: vi.fn(),
    findAll: vi.fn(),
    findOne: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    addMember: vi.fn(),
    removeMember: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TeamsController],
      providers: [
        {
          provide: TeamsService,
          useValue: mockTeamsService,
        },
      ],
    }).compile();

    controller = module.get<TeamsController>(TeamsController);
  });

  it('controller tanımlı olmalıdır', () => {
    expect(controller).toBeDefined();
  });

  it('atama mesajındaki iki ID değerini service katmanına iletir', async () => {
    const person = { id: 10, teamId: 1 };
    mockTeamsService.addMember.mockResolvedValue(person);
    expect(
      await controller.addMember({ teamId: 1, workforceUserId: 10 }),
    ).toEqual(person);
    expect(mockTeamsService.addMember).toHaveBeenCalledWith(1, 10);
  });

  it('çıkarma mesajındaki iki ID değerini service katmanına iletir', async () => {
    const person = { id: 10, teamId: null };
    mockTeamsService.removeMember.mockResolvedValue(person);
    expect(
      await controller.removeMember({ teamId: 1, workforceUserId: 10 }),
    ).toEqual(person);
    expect(mockTeamsService.removeMember).toHaveBeenCalledWith(1, 10);
  });
});