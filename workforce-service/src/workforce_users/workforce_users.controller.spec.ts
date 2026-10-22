import { Test, TestingModule } from '@nestjs/testing';
import { WorkforceUsersController } from './workforce_users.controller.js';
import { WorkforceUsersService } from './workforce_users.service.js';

describe('WorkforceUsersController', () => {
  let controller: WorkforceUsersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorkforceUsersController],
      providers: [WorkforceUsersService],
    }).compile();

    controller = module.get<WorkforceUsersController>(WorkforceUsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
