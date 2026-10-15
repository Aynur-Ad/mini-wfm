import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  Post,
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
}
