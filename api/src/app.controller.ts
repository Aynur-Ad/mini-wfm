import { Controller, Get, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Observable } from 'rxjs';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(
    @Inject('WORKFORCE_SERVICE') private readonly workforceClient: ClientProxy,
  ) {}
  
  @Get('health')
  @ApiOperation({ summary: 'Workforce servis bağlantısını kontrol eder' })
  @ApiResponse({
    status: 200,
    description: 'Workforce servisinden gelen pong yanıtı',
  })
  getHealth(): Observable<string> {
    // workforce-service'teki @MessagePattern('ping)'e mesaj gönderir
    return this.workforceClient.send<string>('ping', {});
  }
}
