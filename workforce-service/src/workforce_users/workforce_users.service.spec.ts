import { Test, TestingModule } from '@nestjs/testing';
import { WorkforceUsersService } from './workforce_users.service.js';

describe('WorkforceUsersService', () => {
  let service: WorkforceUsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WorkforceUsersService],
    }).compile();

    service = module.get<WorkforceUsersService>(WorkforceUsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
