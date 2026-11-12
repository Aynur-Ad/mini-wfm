import type { QueryWorkOrdersDto } from './dto/query-work-orders.dto.js';
import type { WorkOrderListDto } from './dto/work-order-list.dto.js';
import { ForbiddenException } from '@nestjs/common';
import { firstValueFrom, from } from 'rxjs';
import type { AuthUser } from '../auth/auth-user.js';
import { AccountRole } from '../accounts/account-role.js';
import { WorkOrderStatus } from './work-order.enums.js';
import type { ChangeWorkOrderStatusDto } from './dto/change-work-order-status.dto.js';
import type { WorkOrderHistoryDto } from './dto/work-order-history.dto.js';
import { Inject, Injectable } from '@nestjs/common';
import { WorkforceClient } from '../common/clients/workforce-client.js';
import type { CreateWorkOrderDto } from './dto/create-work-order.dto.js';
import type { UpdateWorkOrderDto } from './dto/update-work-order.dto.js';
import type { WorkOrderResponseDto } from './dto/work-order-response.dto.js';
@Injectable()
export class WorkOrdersService {
  constructor(
    @Inject('WORKFORCE_SERVICE') private readonly client: WorkforceClient,
  ) {}
  create(dto: CreateWorkOrderDto) {
    return this.client.send<WorkOrderResponseDto>('createWorkOrder', dto);
  }
  findAll(dto: QueryWorkOrdersDto) {
    return this.client.send<WorkOrderListDto>('findAllWorkOrders', dto);
  }
  findOne(id: number) {
    return this.client.send<WorkOrderResponseDto>('findOneWorkOrder', id);
  }
  update(id: number, dto: UpdateWorkOrderDto) {
    return this.client.send<WorkOrderResponseDto>(
      'updateWorkOrder',
      Object.assign({}, dto, { id }),
    );
  }
  changeStatus(id: number, dto: ChangeWorkOrderStatusDto, user: AuthUser) {
    return from(this.changeStatusChecked(id, dto, user));
  }
  private async changeStatusChecked(
    id: number,
    dto: ChangeWorkOrderStatusDto,
    user: AuthUser,
  ) {
    const current = await firstValueFrom(this.findOne(id));
    // B13: state'e bağlı yetki kontrolü API'de yapılır. Worker rol yorumlamaz.
    const adminOnly = new Set([
      `${WorkOrderStatus.IN_PROGRESS}:${WorkOrderStatus.CANCELLED}`,
    ]);
    if (
      user.role !== AccountRole.ADMIN &&
      adminOnly.has(`${current.status}:${dto.status}`)
    )
      throw new ForbiddenException('Bu işlem için yetkiniz yok');
    return firstValueFrom(
      this.client.send<WorkOrderResponseDto>(
        'changeWorkOrderStatus',
        Object.assign({}, dto, { id, expectedStatus: current.status }),
      ),
    );
  }
  findHistory(id: number) {
    return this.client.send<WorkOrderHistoryDto[]>('findWorkOrderHistory', id);
  }
}