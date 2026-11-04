import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class AddTeamMemberDto {
  @ApiProperty({
    description: 'Ekibe atanacak personelin ID değeri',
    example: 10,
    minimum: 1,
  })
  @IsInt({ message: 'Personel ID bir tam sayı olmalıdır' })
  @Min(1, { message: 'Personel ID en az 1 olmalıdır' })
  workforceUserId: number;
}