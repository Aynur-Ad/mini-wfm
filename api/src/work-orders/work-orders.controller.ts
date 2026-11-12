import { QueryWorkOrdersDto } from './dto/query-work-orders.dto.js';
import { WorkOrderListDto } from './dto/work-order-list.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../auth/auth-user.js';
import { ChangeWorkOrderStatusDto } from './dto/change-work-order-status.dto.js';
import { WorkOrderHistoryDto } from './dto/work-order-history.dto.js';
import {
  Body,
  Controller,
  Get,
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
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AccountRole } from '../accounts/account-role.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { WorkOrdersService } from './work-orders.service.js';
import { CreateWorkOrderDto } from './dto/create-work-order.dto.js';
import { UpdateWorkOrderDto } from './dto/update-work-order.dto.js';
import { WorkOrderResponseDto } from './dto/work-order-response.dto.js';
@ApiTags('WorkOrders')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({
  description: 'Token yok, geçersiz veya süresi dolmuş',
})
@ApiForbiddenResponse({ description: 'Bu işlem için yetkiniz yok' })
@ApiBadRequestResponse({ description: 'Geçersiz veri veya geçmiş son tarih' })
@ApiNotFoundResponse({ description: 'İş emri bulunamadı' })
@Controller('work-orders')
export class WorkOrdersController {
  constructor(private readonly orders: WorkOrdersService) {}
  @Post()
  @Roles(AccountRole.ADMIN, AccountRole.PLANNER)
  @ApiOperation({
    summary: 'İş emri oluşturur',
    description:
      'İzin verilen roller: ADMIN, PLANNER. Kod sequence ile, oluşturan actor ile belirlenir. Durum OPEN, ekip null; öncelik varsayılan MEDIUM.',
  })
  @ApiCreatedResponse({ type: WorkOrderResponseDto })
  create(@Body() dto: CreateWorkOrderDto) {
    return this.orders.create(dto);
  }
  @Get()
  @Roles(AccountRole.ADMIN, AccountRole.PLANNER, AccountRole.VIEWER)
  @ApiOperation({
    summary: 'İş emirlerini filtreler ve sayfalı listeler',
    description:
      'İzin verilen roller: ADMIN, PLANNER, VIEWER. Filtreler AND ile birleşir; çoklu status kendi içinde OR. Öncelik desc: URGENT, HIGH, MEDIUM, LOW. overdue=false ek filtre uygulamaz.',
  })
  @ApiOkResponse({ type: WorkOrderListDto })
  findAll(@Query() dto: QueryWorkOrdersDto) {
    return this.orders.findAll(dto);
  }
  @Get(':id')
  @Roles(AccountRole.ADMIN, AccountRole.PLANNER, AccountRole.VIEWER)
  @ApiOperation({
    summary: 'İş emri detayını getirir',
    description: 'İzin verilen roller: ADMIN, PLANNER, VIEWER.',
  })
  @ApiOkResponse({ type: WorkOrderResponseDto })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.orders.findOne(id);
  }
  @Patch(':id')
  @Roles(AccountRole.ADMIN, AccountRole.PLANNER)
  @ApiOperation({
    summary: 'İş emrini kısmi günceller',
    description:
      'İzin verilen roller: ADMIN, PLANNER. version zorunludur. Yalnız title/description/priority/dueAt değişir; status ve teamId yok sayılır. Kapanmış iş emri güncellenemez.',
  })
  @ApiOkResponse({ type: WorkOrderResponseDto })
  @ApiConflictResponse({ description: 'Eski version veya kapanmış iş emri' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateWorkOrderDto,
  ) {
    return this.orders.update(id, dto);
  }
  @Patch(':id/status')
  @Roles(AccountRole.ADMIN, AccountRole.PLANNER)
  @ApiOperation({
    summary: 'İş emrinin durumunu değiştirir',
    description:
      'İzin verilen roller: ADMIN, PLANNER. version zorunludur. IN_PROGRESS → CANCELLED yalnızca ADMIN. ASSIGNED hedefi aktif ve aktif üyeli ekip ister. İptalde reason zorunlu. Geçiş ve geçmiş tek transaction içindedir.',
  })
  @ApiOkResponse({ type: WorkOrderResponseDto })
  @ApiConflictResponse({
    description:
      'Eski version, izinsiz durum geçişi veya atamaya uygun olmayan ekip',
  })
  changeStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangeWorkOrderStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.orders.changeStatus(id, dto, user);
  }

  @Get(':id/history')
  @Roles(AccountRole.ADMIN, AccountRole.PLANNER, AccountRole.VIEWER)
  @ApiOperation({
    summary: 'Durum geçmişini getirir',
    description:
      'İzin verilen roller: ADMIN, PLANNER, VIEWER. Eskiden yeniye, değiştiren hesabın kullanıcı adıyla döner.',
  })
  @ApiOkResponse({ type: WorkOrderHistoryDto, isArray: true })
  findHistory(@Param('id', ParseIntPipe) id: number) {
    return this.orders.findHistory(id);
  }
}