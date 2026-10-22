import { Module } from '@nestjs/common';
import { WorkforceUsersService } from './workforce_users.service.js';
import { WorkforceUsersController } from './workforce_users.controller.js';

@Module({
  controllers: [WorkforceUsersController],
  providers: [WorkforceUsersService],
})
export class WorkforceUsersModule {}
