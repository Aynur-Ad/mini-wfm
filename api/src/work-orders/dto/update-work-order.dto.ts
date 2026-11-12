import { PartialType } from '@nestjs/swagger';
import { CreateWorkOrderDto } from './create-work-order.dto.js';
export class UpdateWorkOrderDto extends PartialType(CreateWorkOrderDto, {
  skipNullProperties: false,
}) {}