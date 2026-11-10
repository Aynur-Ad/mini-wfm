import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AccountsController } from './accounts.controller.js';
import { AccountsService } from './accounts.service.js';
import { AccountRole } from './account-role.js';

describe('AccountsController', () => {
  const service = {
    create: vi.fn(),
    findAll: vi.fn(),
    validateCredentials: vi.fn(),
  };
  let controller: AccountsController;
  beforeEach(async () => {
    vi.resetAllMocks();
    const module = await Test.createTestingModule({
      controllers: [AccountsController],
      providers: [{ provide: AccountsService, useValue: service }],
    }).compile();
    controller = module.get(AccountsController);
  });
  it('createAccount verisini service’e aktarır', async () => {
    const dto = {
      username: 'ali',
      password: 'test-only-password',
      role: AccountRole.VIEWER,
    };
    await controller.create(dto);
    expect(service.create).toHaveBeenCalledWith(dto);
  });
  it('findAllAccounts filtrelerini service’e aktarır', async () => {
    await controller.findAll({ page: 2, limit: 5 });
    expect(service.findAll).toHaveBeenCalledWith({ page: 2, limit: 5 });
  });
  it('validateCredentials verisini service’e aktarır', async () => {
    const dto = { username: 'ali', password: 'test-only-password' };
    await controller.validateCredentials(dto);
    expect(service.validateCredentials).toHaveBeenCalledWith(dto);
  });
});