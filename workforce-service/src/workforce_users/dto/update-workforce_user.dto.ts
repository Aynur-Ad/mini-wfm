import { PartialType } from '@nestjs/mapped-types';
import { CreateWorkforceUserDto } from './create-workforce_user.dto.js';

export class UpdateWorkforceUserDto extends PartialType(CreateWorkforceUserDto) {
  id: number;
  isActive?: boolean;
}
