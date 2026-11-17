import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiServiceUnavailableResponse,
} from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator.js';
import { AccountRole } from '../accounts/account-role.js';
import { NotificationsService } from './notifications.service.js';
import { QueryNotificationsDto } from './query-notifications.dto.js';
import { NotificationListDto } from './notification-response.dto.js';
@ApiTags('Notifications')
@ApiBearerAuth('access-token')
@ApiBadRequestResponse({
  description: 'Personel ID, sayfa veya limit geçersiz',
})
@ApiUnauthorizedResponse({ description: 'Geçerli token gerekli' })
@ApiForbiddenResponse({ description: 'Bu işlem için yetkiniz yok' })
@ApiServiceUnavailableResponse({
  description: 'Bildirim servisine ulaşılamıyor',
})
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}
  @Get()
  @Roles(AccountRole.ADMIN, AccountRole.PLANNER, AccountRole.VIEWER)
  @ApiOperation({
    summary: 'Personelin bildirimlerini listeler',
    description:
      'ADMIN, PLANNER, VIEWER. Yeni bildirimler önce gelir; okuma notification-service üzerinden TCP ile yapılır.',
  })
  @ApiOkResponse({ type: NotificationListDto })
  findAll(@Query() query: QueryNotificationsDto) {
    return this.notifications.findAll(query);
  }
}
