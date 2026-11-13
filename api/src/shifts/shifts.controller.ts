import { WorkRuleErrorDto } from './dto/work-rule-error.dto.js';
import { QueryShiftsDto } from './dto/query-shifts.dto.js';
import { ShiftListItemDto } from './dto/shift-list-item.dto.js';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { map } from 'rxjs';
import { Roles } from '../common/decorators/roles.decorator.js';
import { AccountRole } from '../accounts/account-role.js';
import { ShiftsService } from './shifts.service.js';
import { CreateShiftDto } from './dto/create-shift.dto.js';
import { UpdateShiftDto } from './dto/update-shift.dto.js';
import { ShiftResponseDto } from './dto/shift-response.dto.js';

@ApiTags('Shifts')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({
  description: 'Token yok, geçersiz veya süresi dolmuş',
})
@ApiForbiddenResponse({ description: 'Bu işlem için yetkiniz yok' })
@ApiBadRequestResponse({
  description: 'Geçersiz ID/tarih veya 1–12 saat aralığı dışında vardiya',
})
@ApiNotFoundResponse({ description: 'Personel veya vardiya bulunamadı' })
@Controller('shifts')
export class ShiftsController {
  constructor(private readonly shifts: ShiftsService) {}

  @Post()
  @Roles(AccountRole.ADMIN, AccountRole.PLANNER)
  @ApiOperation({
    summary: 'Vardiya oluşturur',
    description:
      'İzin verilen roller: ADMIN, PLANNER. createdById doğrulanmış actor bilgisinden alınır.',
  })
  @ApiCreatedResponse({ type: ShiftResponseDto })
  @ApiConflictResponse({
    type: WorkRuleErrorDto,
    description:
      'Geçmiş tarih, pasif personel, çakışma veya REST/WEEKLY_LIMIT/CONSECUTIVE_DAYS ihlali; çalışma kuralı ihlalleri details içinde döner',
  })
  create(@Body() dto: CreateShiftDto) {
    return this.shifts.create(dto);
  }

  @Get()
  @Roles(AccountRole.ADMIN, AccountRole.PLANNER, AccountRole.VIEWER)
  @ApiOperation({
    summary: 'Tarih aralığıyla kesişen vardiyaları listeler',
    description:
      'İzin verilen roller: ADMIN, PLANNER, VIEWER. En fazla 31 günlük [from, to) aralığı; gece vardiyaları kısmen kesişse de döner. Liste sayfasız, başlangıca ve eşitlikte ID değerine göre artan sıralıdır. teamId personelin şu anki ekibidir.',
  })
  @ApiOkResponse({
    type: ShiftListItemDto,
    isArray: true,
    description:
      'Vardiya dizisi; personel ve güncel ekip özeti içerir. Sonuç yoksa [].',
  })
  @ApiBadRequestResponse({
    description:
      'Eksik/geçersiz from veya to, ters/boş ya da 31 günü aşan aralık, geçersiz filtre ID',
  })
  findAll(@Query() query: QueryShiftsDto) {
    return this.shifts.findAll(query);
  }

  @Get(':id')
  @Roles(AccountRole.ADMIN, AccountRole.PLANNER, AccountRole.VIEWER)
  @ApiOperation({
    summary: 'Tek vardiyayı getirir',
    description:
      'İzin verilen roller: ADMIN, PLANNER, VIEWER. Tarihler UTC ISO 8601 (Z) biçiminde döner.',
  })
  @ApiOkResponse({ type: ShiftResponseDto })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.shifts.findOne(id);
  }

  @Patch(':id')
  @Roles(AccountRole.ADMIN, AccountRole.PLANNER)
  @ApiOperation({
    summary: 'Gelecekteki vardiyayı kısmi günceller',
    description:
      'İzin verilen roller: ADMIN, PLANNER. Gönderilmeyen alanlar korunur; note null ile temizlenebilir. createdById değişmez.',
  })
  @ApiOkResponse({ type: ShiftResponseDto })
  @ApiConflictResponse({
    type: WorkRuleErrorDto,
    description:
      'Başlamış vardiya, geçmiş yeni tarih, pasif personel, çakışma veya details içinde çalışma kuralı ihlali',
  })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateShiftDto) {
    return this.shifts.update(id, dto);
  }

  @Delete(':id')
  @Roles(AccountRole.ADMIN, AccountRole.PLANNER)
  @HttpCode(204)
  @ApiOperation({
    summary: 'Gelecekteki vardiyayı siler',
    description:
      'İzin verilen roller: ADMIN, PLANNER. Başlamış vardiya silinemez; başarılı yanıt gövdesizdir.',
  })
  @ApiNoContentResponse({ description: 'Vardiya silindi' })
  @ApiConflictResponse({ description: 'Başlamış vardiya veya pasif personel' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.shifts.remove(id).pipe(map(() => undefined));
  }
}