import { Roles } from '../common/decorators/roles.decorator.js';
import { AccountRole } from '../accounts/account-role.js';
import {
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { map, Observable } from 'rxjs';
import { TeamsService } from './teams.service.js';
import { CreateTeamDto } from './dto/create-team.dto.js';
import { QueryTeamsDto } from './dto/query-teams.dto.js';
import { UpdateTeamDto } from './dto/update-team.dto.js';
import { AddTeamMemberDto } from './dto/add-team-member.dto.js';
import { TeamDetailResponseDto } from './dto/team-detail-response.dto.js';
import { WorkforceUserResponseDto } from '../workforce_users/dto/workforce_user-response.dto.js';

@ApiTags('Teams')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({
  description: 'Token yok, geçersiz veya süresi dolmuş',
})
@ApiForbiddenResponse({ description: 'Bu işlem için yetkiniz yok' })
@Controller('teams') // main.ts'deki setGlobalPrefix('api') sayesinde /api/teams olur
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post()
  @Roles(AccountRole.ADMIN)
  @ApiOperation({
    summary: 'Yeni bir ekip oluşturur',
    description: 'İzin verilen roller: ADMIN.',
  })
  @ApiCreatedResponse({ description: 'Ekip başarıyla oluşturuldu' })
  @ApiBadRequestResponse({
    description: 'Doğrulama hatası (name boş veya 200 karakterden uzun)',
  })
  @ApiConflictResponse({ description: 'Bu isimde bir ekip zaten var' })
  create(@Body() createTeamDto: CreateTeamDto): Observable<unknown> {
    return this.teamsService.create(createTeamDto);
  }

  @Get()
  @Roles(AccountRole.ADMIN, AccountRole.PLANNER, AccountRole.VIEWER)
  @ApiOperation({
    summary: 'Ekipleri sayfalı, aranabilir ve filtrelenebilir şekilde listeler',
    description: 'İzin verilen roller: ADMIN, PLANNER, VIEWER.',
  })
  @ApiOkResponse({ description: 'Ekip listesi başarıyla getirildi' })
  @ApiBadRequestResponse({
    description: 'Geçersiz query parametresi (ör. page < 1 veya limit > 100)',
  })
  findAll(@Query() queryTeamsDto: QueryTeamsDto): Observable<unknown> {
    return this.teamsService.findAll(queryTeamsDto);
  }

  @Get(':id')
  @Roles(AccountRole.ADMIN, AccountRole.PLANNER, AccountRole.VIEWER)
  @ApiOperation({
    summary: 'ID bilgisine göre ekip detayını getirir',
    description: 'İzin verilen roller: ADMIN, PLANNER, VIEWER.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Ekibin sayısal ID değeri',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Ekip detayı üyeleriyle birlikte getirildi',
    type: TeamDetailResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Geçersiz ID formatı (sayı değil)' })
  @ApiNotFoundResponse({ description: 'Ekip bulunamadı' })
  findOne(@Param('id', ParseIntPipe) id: number): Observable<unknown> {
    return this.teamsService.findOne(id);
  }

  @Patch(':id')
  @Roles(AccountRole.ADMIN)
  @ApiOperation({
    summary: 'Mevcut bir ekibi kısmi olarak günceller',
    description: 'İzin verilen roller: ADMIN.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Güncellenecek ekibin sayısal ID değeri',
    example: 1,
  })
  @ApiOkResponse({ description: 'Ekip başarıyla güncellendi' })
  @ApiBadRequestResponse({ description: 'Doğrulama hatası veya geçersiz ID' })
  @ApiNotFoundResponse({ description: 'Ekip bulunamadı' })
  @ApiConflictResponse({ description: 'Bu isimde bir ekip zaten var' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTeamDto: UpdateTeamDto,
  ): Observable<unknown> {
    return this.teamsService.update(id, updateTeamDto);
  }

  @Delete(':id')
  @Roles(AccountRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'ID bilgisine göre ekibi siler',
    description: 'İzin verilen roller: ADMIN.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Silinecek ekibin sayısal ID değeri',
    example: 1,
  })
  @ApiNoContentResponse({ description: 'Ekip başarıyla silindi' })
  @ApiConflictResponse({ description: 'Üyesi olan ekip silinemez' })
  @ApiBadRequestResponse({ description: 'Geçersiz ID formatı (sayı değil)' })
  @ApiNotFoundResponse({ description: 'Ekip bulunamadı' })
  remove(@Param('id', ParseIntPipe) id: number): Observable<void> {
    return this.teamsService.remove(id).pipe(map(() => undefined));
  }

  @Post(':id/members')
  @Roles(AccountRole.ADMIN)
  @ApiOperation({
    summary: 'Aktif personeli aktif bir ekibe atar',
    description: 'İzin verilen roller: ADMIN.',
  })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiCreatedResponse({
    description: 'Personel ekibe atandı',
    type: WorkforceUserResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Geçersiz ekip veya personel ID' })
  @ApiNotFoundResponse({ description: 'Ekip veya personel bulunamadı' })
  @ApiConflictResponse({
    description:
      'Ekip/personel pasif veya personel zaten bir ekibe atanmış; mevcut ekibin adı mesajda yer alır',
  })
  addMember(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddTeamMemberDto,
  ): Observable<WorkforceUserResponseDto> {
    return this.teamsService.addMember(id, dto.workforceUserId);
  }

  @Delete(':id/members/:workforceUserId')
  @Roles(AccountRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Personeli silmeden ekip üyeliğini kaldırır',
    description: 'İzin verilen roller: ADMIN.',
  })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiParam({ name: 'workforceUserId', type: Number, example: 10 })
  @ApiNoContentResponse({
    description: 'Üyelik kaldırıldı; personel kaydı korunur',
  })
  @ApiBadRequestResponse({ description: 'Geçersiz ID formatı' })
  @ApiNotFoundResponse({
    description: 'Ekip/personel bulunamadı veya personel bu ekibin üyesi değil',
  })
  @ApiConflictResponse({ description: 'Ekip veya personel pasif' })
  removeMember(
    @Param('id', ParseIntPipe) id: number,
    @Param('workforceUserId', ParseIntPipe) workforceUserId: number,
  ): Observable<void> {
    return this.teamsService
      .removeMember(id, workforceUserId)
      .pipe(map(() => undefined));
  }
}