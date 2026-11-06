import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

import type { Response } from 'express';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isErrorMessage(value: unknown): value is string | string[] {
  return (
    typeof value === 'string' ||
    (Array.isArray(value) &&
      value.every((item: unknown) => typeof item === 'string'))
  );
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Beklenmeyen bir hata oluştu';

    const err = isRecord(exception) ? exception : undefined;
    const nestedError = isRecord(err?.error) ? err.error : undefined;

    // workforce-service ulaşılamaz durumda mı? (ECONNREFUSED)
    if (
      err?.code === 'ECONNREFUSED' ||
      err?.code === 'ECONNRESET' ||
      err?.code === 'EPIPE' ||
      err?.message === 'Connection closed' ||
      (typeof err?.message === 'string' &&
        err.message.includes('ECONNREFUSED')) ||
      nestedError?.code === 'ECONNREFUSED'
    ) {
      statusCode = HttpStatus.SERVICE_UNAVAILABLE; // 503
      message = 'Servise şu anda ulaşılamıyor';
    }
    // 2. workforce-service'ten RpcException ile gelen hata mı?
    // Nest ClientProxy microservice hatasını nesne veya error alanı içinde taşır.
    else if (
      err?.statusCode &&
      err?.message &&
      isErrorMessage(err.message) &&
      !(exception instanceof HttpException)
    ) {
      statusCode = Number(err.statusCode);
      message = err.message;
    } else if (
      nestedError?.statusCode &&
      nestedError.message &&
      isErrorMessage(nestedError.message)
    ) {
      statusCode = Number(nestedError.statusCode);
      message = nestedError.message;
    }
    // 3. API servisinin kendi HttpException hataları (örn. 400 ValidationPipe, 401, 403 vb.)
    else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res == 'string') {
        message = res;
      } else if (isRecord(res)) {
        // NestJS varsayılan validation mesajları string array dönebilir.
        const responseMessage = res.message || res.error;
        if (isErrorMessage(responseMessage)) {
          message = responseMessage;
        }
      }
    }
    // Diğer her şey (500 Internal Server Error)
    else {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR; // 500
      message = 'Beklenmeyen bir hata oluştu';
      // Hatanın detayını ve stack trace'ini NestJS Logger'ına basıyoruz (istemciye gitmez)
      this.logger.error(
        `Beklenmeyen Hata: ${String(err?.message || exception)}`,
        typeof err?.stack === 'string' ? err.stack : undefined,
      );
    }

    // P2 Hata Yanıt Biçimi ( stack trace yok)
    const errorResponse = {
      statusCode,
      message,
    };

    response.status(statusCode).json(errorResponse);
  }
}