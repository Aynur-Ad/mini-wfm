import { Inject, Injectable } from '@nestjs/common';
import { WorkforceClient } from './common/clients/workforce-client.js';
import { Observable } from 'rxjs';

@Injectable()
export class AppService {
  constructor(
    @Inject('WORKFORCE_SERVICE')
    private readonly workforceClient: WorkforceClient,
  ) {}

  getHealth(): Observable<string> {
    // workforce-service'teki ping mesajına gelen yanıtı döndürür.
    return this.workforceClient.send<string>('ping', {});
  }
}