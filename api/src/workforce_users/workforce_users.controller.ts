import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { map, Observable } from 'rxjs';
import { CreateWorkforceUserDto } from './dto/create-workforce_user.dto.js';
import { QueryWorkforceUsersDto } from './dto/query-workforce_users.dto.js';
import { UpdateWorkforceUserDto } from './dto/update-workforce_user.dto.js';
import {
  WorkforceUserResponseDto,
  WorkforceUsersPageDto,
} from './dto/workforce_user-response.dto.js';

@ApiTags('Workforce_Users')
@Controller('workforce-users')
export class WorkforceUsersController {
  constructor(
    @Inject('WORKFORCE_SERVICE') private readonly workforceClient: ClientProxy,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Yeni bir personel oluşturur' })
  @ApiCreatedResponse({
    description: 'Personel başarıyla oluşturuldu',
    type: WorkforceUserResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Ad, soyad, sicil numarası veya telefon doğrulama hatası',
  })
  @ApiConflictResponse({
    description: 'Sicil numarası başka personelde kullanılıyor',
  })
  create(
    @Body() dto: CreateWorkforceUserDto,
  ): Observable<WorkforceUserResponseDto> {
    return this.workforceClient.send('createWorkforceUser', dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Personelleri sayfalı, aranabilir ve filtrelenebilir listeler',
  })
  @ApiOkResponse({
    description: 'Personel listesi',
    type: WorkforceUsersPageDto,
  })
  @ApiBadRequestResponse({
    description: 'Geçersiz sayfa, limit veya aktiflik filtresi',
  })
  findAll(
    @Query() query: QueryWorkforceUsersDto,
  ): Observable<WorkforceUsersPageDto> {
    return this.workforceClient.send('findAllWorkforceUsers', query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'ID bilgisine göre personel detayını getirir' })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Personelin kimliği',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Personel detayı',
    type: WorkforceUserResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Geçersiz ID formatı' })
  @ApiNotFoundResponse({ description: 'Personel bulunamadı' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Observable<WorkforceUserResponseDto> {
    return this.workforceClient.send('findOneWorkforceUser', id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Personelin yalnızca gönderilen alanlarını günceller',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Personelin kimliği',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Güncel personel',
    type: WorkforceUserResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Geçersiz ID veya güncelleme verisi' })
  @ApiNotFoundResponse({ description: 'Personel bulunamadı' })
  @ApiConflictResponse({
    description: 'Sicil numarası başka personelde kullanılıyor',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateWorkforceUserDto,
  ): Observable<WorkforceUserResponseDto> {
    // Adresteki kimlik esastır; body içindeki yabancı alanlar kimliği değiştiremez.
    return this.workforceClient.send('updateWorkforceUser', {
      firstName: dto.firstName,
      lastName: dto.lastName,
      registrationNumber: dto.registrationNumber,
      phone: dto.phone,
      isActive: dto.isActive,
      id,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Personeli kalıcı olarak siler' })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Personelin kimliği',
    example: 1,
  })
  @ApiNoContentResponse({
    description: 'Personel silindi; yanıt gövdesi boştur',
  })
  @ApiBadRequestResponse({ description: 'Geçersiz ID formatı' })
  @ApiNotFoundResponse({ description: 'Personel bulunamadı' })
  remove(@Param('id', ParseIntPipe) id: number): Observable<void> {
    // TCP silme yanıtını koruyup HTTP tarafında boş gövdeye çevirir.
    return this.workforceClient
      .send('removeWorkforceUser', id)
      .pipe(map(() => undefined));
  }
}