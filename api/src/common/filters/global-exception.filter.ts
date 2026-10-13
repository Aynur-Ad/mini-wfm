import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpException,
    HttpStatus,
    Logger
} from '@nestjs/common';
import { timeStamp } from 'console';

import type { Request, Response  } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(GlobalExceptionFilter.name);

    catch(exception: unknown, host: ArgumentsHost): void {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
        let message: string | string[] = 'Beklenmeyen bir hata oluştu';

        const err = exception as any;

        // workforce-service ulaşılamaz durumda mı? (ECONNREFUSED)
        if (
            err?.code === 'ECONNREFUSED' ||
            err?.message?.includes?.('ECONNREFUSED') ||
            err?.error?.code === 'ECONNREFUSED'
        ) {
            statusCode = HttpStatus.SERVICE_UNAVAILABLE; // 503
            message = 'Servise şu anda ulaşılamıyor';
        }
        // 2. workforce-service'ten RpcException ile gelen hata mı?
        // Nest ClientProxy microservice hatasını nesne veya error alanı içinde taşır.
        else if (
            err?.statusCode &&
            err?.message &&
            !(exception instanceof HttpException)
        ) {
            statusCode = Number(err.statusCode);
            message = err.message;
        } else if (
            err?.error &&
            typeof err.error === 'object' &&
            err.error.statusCode &&
            err.error.message
        ) {
            statusCode = Number(err.error.statusCode);
            message = err.error.message;
        }
        // 3. API servisinin kendi HttpException hataları (örn. 400 ValidationPipe, 401, 403 vb.)
        else if (exception instanceof HttpException) {
            statusCode = exception.getStatus();
            const res = exception.getResponse();

            if (typeof res == 'string') {
                message = res;
            } else if (typeof res === 'object' && res !== null) {
                // NestJS varsayılan validation mesajları string array dönebilir.
                message = (res as any).message || (res as any).error || message;

            }        
        }
        // Diğer her şey (500 Internal Server Error)
        else {
            statusCode = HttpStatus.INTERNAL_SERVER_ERROR; // 500
            message = 'Beklenmeyen bir hata oluştu';
            // Hatanın detayını ve stack trace'ini NestJS Logger'ına basıyoruz (istemciye gitmez)
            this.logger.error(
                `Beklenmeyen Hata: ${err?.message || err}`,
                err?.stack,
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