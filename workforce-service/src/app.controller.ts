import { Controller, Get } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { HttpStatus, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';

@Controller()
export class AppController {
  @MessagePattern('ping')
  ping(): string {
    return 'pong';
  }
}

@Injectable()
export class WorkforceService {
  findWorkerById(id: string) {
    const worker = null;

    if (!worker) {
      // API servisine iletilecek durum kodu ve hata mesajı
      throw new RpcException({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Çalışan bulunamadı',
      });
    }
    return worker;
  }
}
