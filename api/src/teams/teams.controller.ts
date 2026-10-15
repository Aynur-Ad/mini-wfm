import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { CreateTeamDto } from './dto/create-team.dto.js';
import { QueryTeamsDto } from './dto/query-teams.dto.js';
import { UpdateTeamDto } from './dto/update-team.dto.js';

@ApiTags('Teams')
@Controller('teams') // main.ts'deki setGlobalPrefix('api') sayesinde /api/teams olur
export class TeamsController {
  constructor(
    @Inject('WORKFORCE_SERVICE') private readonly workforceClient: ClientProxy,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Yeni bir ekip oluşturur' })
  @ApiCreatedResponse({ description: 'Ekip başarıyla oluşturuldu' })
  @ApiBadRequestResponse({
    description: 'Doğrulama hatası (name boş veya 200 karakterden uzun)',
  })
  @ApiConflictResponse({ description: 'Bu isimde bir ekip zaten var' })
  create(@Body() createTeamDto: CreateTeamDto): Observable<unknown> {
    return this.workforceClient.send('createTeam', createTeamDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Ekipleri sayfalı, aranabilir ve filtrelenebilir şekilde listeler',
  })
  @ApiOkResponse({ description: 'Ekip listesi başarıyla getirildi' })
  @ApiBadRequestResponse({
    description: 'Geçersiz query parametresi (ör. page < 1 veya limit > 100)',
  })
  findAll(@Query() queryTeamsDto: QueryTeamsDto): Observable<unknown> {
    return this.workforceClient.send('findAllTeams', queryTeamsDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'ID bilgisine göre ekip detayını getirir' })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Ekibin sayısal ID değeri',
    example: 1,
  })
  @ApiOkResponse({ description: 'Ekip detayı başarıyla getirildi' })
  @ApiBadRequestResponse({ description: 'Geçersiz ID formatı (sayı değil)' })
  @ApiNotFoundResponse({ description: 'Ekip bulunamadı' })
  findOne(@Param('id', ParseIntPipe) id: number): Observable<unknown> {
    return this.workforceClient.send('findOneTeam', id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Mevcut bir ekibi kısmi olarak günceller' })
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
    return this.workforceClient.send('updateTeam', { id, ...updateTeamDto });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'ID bilgisine göre ekibi siler' })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Silinecek ekibin sayısal ID değeri',
    example: 1,
  })
  @ApiOkResponse({ description: 'Ekip başarıyla silindi' })
  @ApiBadRequestResponse({ description: 'Geçersiz ID formatı (sayı değil)' })
  @ApiNotFoundResponse({ description: 'Ekip bulunamadı' })
  remove(@Param('id', ParseIntPipe) id: number): Observable<unknown> {
    return this.workforceClient.send('removeTeam', id);
  }
}
