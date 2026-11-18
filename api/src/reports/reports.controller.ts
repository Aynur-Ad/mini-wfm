import { Controller, Get, Inject, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { timeout } from 'rxjs';
import { AccountRole } from '../accounts/account-role.js';
import { WorkforceClient } from '../common/clients/workforce-client.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { QueryTeamSummaryDto } from './query-team-summary.dto.js';
import { TeamSummaryDto } from './team-summary.dto.js';

@ApiTags('Reports')
@ApiBearerAuth('access-token')
@Controller('reports')
export class ReportsController {
  constructor(
    @Inject('WORKFORCE_SERVICE') private readonly workforce: WorkforceClient,
  ) {}

  @Get('team-summary')
  @Roles(AccountRole.ADMIN, AccountRole.PLANNER, AccountRole.VIEWER)
  @ApiOperation({
    summary: 'Ekip özet raporunu getirir',
    description:
      'İzin verilen roller: ADMIN, PLANNER, VIEWER. Üye ve iş emri sayıları güncel durumu gösterir. Tarih aralığı vardiyalara uygulanır. Vardiyalar personelin mevcut ekibine yazılır.',
  })
  @ApiOkResponse({ type: [TeamSummaryDto] })
  @ApiBadRequestResponse({ description: 'Tarih aralığı geçersiz' })
  @ApiUnauthorizedResponse({ description: 'Geçerli token gerekli' })
  @ApiForbiddenResponse({ description: 'Bu işlem için yetkiniz yok' })
  @ApiServiceUnavailableResponse({
    description: 'Workforce servisine ulaşılamıyor',
  })
  teamSummary(@Query() query: QueryTeamSummaryDto) {
    return this.workforce
      .send<TeamSummaryDto[]>('findTeamSummary', {
        from: query.from,
        to: query.to,
      })
      .pipe(timeout(3000));
  }
}
