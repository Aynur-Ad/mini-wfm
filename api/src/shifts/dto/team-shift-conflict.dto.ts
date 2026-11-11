import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ShiftConflictPersonDto {
  @ApiProperty() workforceUserId: number;
  @ApiProperty() registrationNumber: string;
  @ApiProperty() firstName: string;
  @ApiProperty() lastName: string;
}

export class TeamShiftConflictDto {
  @ApiProperty({ example: 409 }) statusCode: number;
  @ApiProperty({ example: 'Ekip üyelerinin mevcut vardiyalarıyla çakışma var' })
  message: string;
  @ApiPropertyOptional({
    type: [ShiftConflictPersonDto],
    description:
      'Çakışma durumunda tüm çakışan aktif personeller; personel başına tek kayıt',
  })
  details?: ShiftConflictPersonDto[];
}