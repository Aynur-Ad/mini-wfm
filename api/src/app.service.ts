import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Observable } from 'rxjs';

@Injectable()
export class AppService {
  constructor(
    @Inject('WORKFORCE_SERVICE') private readonly workforceClient: ClientProxy,
  ) {}

  getHealth(): Observable<string> {
    // workforce-service'teki ping mesajına gelen yanıtı döndürür.
    return this.workforceClient.send<string>('ping', {});
  }
}