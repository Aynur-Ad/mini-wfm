import type { RequestContext } from '../logging/request-context.js';
import { Injectable, Logger } from '@nestjs/common';
import type {
  CallHandler,
  ExecutionContext,
  NestInterceptor,
} from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { Observable } from 'rxjs';
import { performance } from 'node:perf_hooks';
import {
  requestContext,
  resolveCorrelationId,
} from '../logging/request-context.js';

interface HttpTrace extends RequestContext {
  startedAt: number;
}

type AuthenticatedRequest = Request & { user?: { id?: number | string } };

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(HttpLoggingInterceptor.name);
  private readonly traces = new WeakMap<Request, HttpTrace>();

  // Interceptor'a ulaşmayan 404 ve ilerideki guard hataları da aynı kapsamda kalır.
  middleware() {
    return (request: Request, response: Response, next: NextFunction): void => {
      this.withContext(request, response, next);
    };
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    return new Observable((subscriber) =>
      this.withContext(request, response, () =>
        next.handle().subscribe(subscriber),
      ),
    );
  }

  private withContext<T>(
    request: Request,
    response: Response,
    work: () => T,
  ): T {
    let trace = this.traces.get(request);
    if (!trace) {
      trace = {
        actor: null,
        correlationId: resolveCorrelationId(
          request.headers['x-correlation-id'],
        ),
        startedAt: performance.now(),
      };
      this.traces.set(request, trace);
      response.setHeader('X-Correlation-Id', trace.correlationId);
      const current = trace;
      // finalize, exception filter'dan önce çalışabilir. finish gerçek HTTP kodunu görür.
      response.once('finish', () => {
        requestContext.run(current, () =>
          this.writeLog(request, response, current),
        );
      });
    }
    return requestContext.run(trace, work);
  }

  private writeLog(
    request: AuthenticatedRequest,
    response: Response,
    trace: HttpTrace,
  ): void {
    // URL query değerleri ve dinamik parametreler telefon/token içerebilir.
    // Adres olarak güvenli route şablonu kullanılır; body/headers loglanmaz.
    const route: unknown = request.route?.path;
    const userId = request.user?.id;
    this.logger.log(
      JSON.stringify({
        correlationId: trace.correlationId,
        method: request.method,
        address: typeof route === 'string' ? route : '[unmatched route]',
        statusCode: response.statusCode,
        durationMs: Math.round(performance.now() - trace.startedAt),
        userId: typeof userId === 'number' ? userId : null,
      }),
    );
  }
}