import { IsInt, Min } from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateWorkOrderDto } from './create-work-order.dto.js';
export class UpdateWorkOrderDto extends PartialType(CreateWorkOrderDto, {
  skipNullProperties: false,
}) {
  @ApiProperty({
    minimum: 1,
    example: 1,
    description: 'Son GET yanıtındaki version; eski sürüm 409 döner',
  })
  @IsInt()
  @Min(1)
  version: number;
}