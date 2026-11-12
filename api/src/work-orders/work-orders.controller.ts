import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
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
      'İzin verilen roller: ADMIN, PLANNER. Yalnız title/description/priority/dueAt değişir; status ve teamId yok sayılır. Kapanmış iş emri güncellenemez.',
  })
  @ApiOkResponse({ type: WorkOrderResponseDto })
  @ApiConflictResponse({ description: 'Kapanmış iş emri güncellenemez' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateWorkOrderDto,
  ) {
    return this.orders.update(id, dto);
  }
}