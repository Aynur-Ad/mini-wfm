import { Public } from './common/decorators/public.decorator.js';
import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { AppService } from './app.service.js';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Workforce servis bağlantısını kontrol eder' })
  @ApiResponse({
    status: 200,
    description: 'Workforce servisinden gelen pong yanıtı',
  })
  getHealth(): Observable<string> {
    return this.appService.getHealth();
  }
}