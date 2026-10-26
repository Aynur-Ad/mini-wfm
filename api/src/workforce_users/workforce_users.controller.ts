import {
    Body,
    Controller,
    Inject,
    Post,
} from "@nestjs/common";

import { ClientProxy } from "@nestjs/microservices";

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

import { CreateWorkforceUserDto } from './dto/create-workforce_user.dto.js';
import { Observable } from "rxjs";

@ApiTags('Workforce_Users')
@Controller('workforce-users') // main.ts'deki setGlobalPrefix('api') sayesinde /api/workforce-users olur
export class WorkforceUsersController {
    constructor(
        @Inject('WORKFORCE_SERVICE') private readonly workforceClient: ClientProxy,
    ) {}

    @Post()
    @ApiOperation({ summary: 'Yeni bir personel oluşturur' })
    @ApiCreatedResponse({ description: 'Personel başarıyla oluşturuldu' })
    @ApiBadRequestResponse({ description: 'Doğrulama hatası (firstName boş veya 100 karakterden uzun)' })
    @ApiBadRequestResponse({ description: 'Doğrulama hatası (lastName boş veya 100 karakterden uzun)' })
    @ApiBadRequestResponse({ description: 'Doğrulama hatası (registrationNumber boş veya 20 karakterden uzun)' })
    @ApiBadRequestResponse({ description: 'Doğrulama hatası (phone 5 ile başlamak zorundadır ve 10 karakter olmak zorundadır)' })
    
    @ApiConflictResponse({ description: 'Bu sicil numarasına sahip bir personel zaten var' })

    create(@Body() createWorkforceUserDto: CreateWorkforceUserDto): Observable<unknown> {
        return this.workforceClient.send('createWorkforceUser', createWorkforceUserDto);
    }
}



