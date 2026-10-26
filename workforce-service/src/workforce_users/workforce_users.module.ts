import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkforceUser } from './entities/workforce_user.entity.js' ;
import { WorkforceUsersService } from './workforce_users.service.js';
import { WorkforceUsersController } from './workforce_users.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([WorkforceUser])],
  controllers: [WorkforceUsersController],
  providers: [WorkforceUsersService],
})
export class WorkforceUsersModule {}