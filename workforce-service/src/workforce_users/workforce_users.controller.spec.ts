import { Test } from '@nestjs/testing';
import { vi } from 'vitest';
import { WorkforceUsersController } from './workforce_users.controller.js';
import { WorkforceUsersService } from './workforce_users.service.js';

describe('WorkforceUsersController (TCP)', () => {
  let controller: WorkforceUsersController;
  const service = {
    create: vi.fn(),
    findAll: vi.fn(),
    findOne: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  };

  beforeEach(async () => {
    vi.resetAllMocks();
    const module = await Test.createTestingModule({
      controllers: [WorkforceUsersController],
      providers: [{ provide: WorkforceUsersService, useValue: service }],
    }).compile();
    controller = module.get(WorkforceUsersController);
  });

  it('oluşturma verisini service’e aktarır ve sonucu döndürür', async () => {
    const dto = {
      firstName: 'Deniz',
      lastName: 'Kaya',
      registrationNumber: 'P1001',
    };
    service.create.mockResolvedValue({ id: 1, ...dto });
    expect(await controller.create(dto)).toEqual({ id: 1, ...dto });
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('liste sorgusunu service’e aktarır', async () => {
    const query = { page: 2, limit: 20, search: 'Kaya', isActive: false };
    const result = { data: [], total: 0, page: 2, limit: 20 };
    service.findAll.mockResolvedValue(result);
    expect(await controller.findAll(query)).toEqual(result);
    expect(service.findAll).toHaveBeenCalledWith(query);
  });

  it('detay kimliğini service’e aktarır', async () => {
    service.findOne.mockResolvedValue({ id: 1 });
    expect(await controller.findOne(1)).toEqual({ id: 1 });
    expect(service.findOne).toHaveBeenCalledWith(1);
  });

  it('güncelleme kimliğini ve verisini service’e aktarır', async () => {
    const dto = { id: 1, isActive: false };
    service.update.mockResolvedValue(dto);
    expect(await controller.update(dto)).toEqual(dto);
    expect(service.update).toHaveBeenCalledWith(1, dto);
  });

  it('silme kimliğini service’e aktarır', async () => {
    service.remove.mockResolvedValue({ deleted: true, id: 1 });
    expect(await controller.remove(1)).toEqual({ deleted: true, id: 1 });
    expect(service.remove).toHaveBeenCalledWith(1);
  });
});