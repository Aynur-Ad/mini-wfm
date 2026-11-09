import { Injectable, Logger } from '@nestjs/common';
import type {
  CallHandler,
  ExecutionContext,
  NestInterceptor,
} from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Observable, tap } from 'rxjs';
import {
  requestContext,
  resolveCorrelationId,
} from '../logging/request-context.js';

// B10: mesaj tipi her projede ayrı tutulur; ortak kütüphane oluşturulmaz.
interface CorrelatedMessage {
  correlationId: string;
  data: unknown;
}

function isCorrelatedMessage(value: unknown): value is CorrelatedMessage {
  return (
    typeof value === 'object' &&
    value !== null &&
    'correlationId' in value &&
    'data' in value &&
    typeof value.correlationId === 'string'
  );
}

@Injectable()
export class RpcLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RpcLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const payload: unknown = context.switchToRpc().getData();
    const envelope = isCorrelatedMessage(payload) ? payload : undefined;
    const state = {
      correlationId: resolveCorrelationId(envelope?.correlationId),
    };
    // Controller ve iş kuralları orijinal DTO/id'yi alır; zarfı bilmeleri gerekmez.
    if (envelope) context.getArgs<unknown[]>()[0] = envelope.data;
    const handler = context.getHandler().name;

    return new Observable((subscriber) =>
      requestContext.run(state, () => {
        this.logger.log(
          JSON.stringify({
            correlationId: state.correlationId,
            handler,
            phase: 'received',
          }),
        );
        return next
          .handle()
          .pipe(
            tap({
              error: (error: unknown) => {
                const details: unknown =
                  error instanceof RpcException ? error.getError() : undefined;
                const statusCode =
                  typeof details === 'object' &&
                  details !== null &&
                  'statusCode' in details &&
                  typeof details.statusCode === 'number'
                    ? details.statusCode
                    : 500;
                this.logger.warn(
                  JSON.stringify({
                    correlationId: state.correlationId,
                    handler,
                    statusCode,
                  }),
                );
              },
            }),
          )
          .subscribe(subscriber);
      }),
    );
  }
}