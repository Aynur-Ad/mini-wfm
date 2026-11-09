import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import type { Observable } from 'rxjs';
import {
  requestContext,
  resolveCorrelationId,
} from '../logging/request-context.js';

export interface CorrelatedMessage<T> {
  correlationId: string;
  data: T;
}

@Injectable()
export class WorkforceClient {
  constructor(@Inject('WORKFORCE_TCP') private readonly client: ClientProxy) {}

  send<T = unknown>(pattern: string, data: unknown): Observable<T> {
    const envelope: CorrelatedMessage<unknown> = {
      correlationId: resolveCorrelationId(
        requestContext.getStore()?.correlationId,
      ),
      data,
    };
    // Kimlik burada, tek yerde eklenir. Service'ler iş verisini eskisi gibi gönderir.
    return this.client.send<T>(pattern, envelope);
  }
}