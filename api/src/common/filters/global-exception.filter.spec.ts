import { requestContext } from '../logging/request-context.js';
import {
  ArgumentsHost,
  BadRequestException,
  HttpException,
  Logger,
} from '@nestjs/common';
import { vi } from 'vitest';
import { GlobalExceptionFilter } from './global-exception.filter.js';

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  const logError = vi.fn<(message: unknown) => void>();
  const response = { status: vi.fn(), json: vi.fn() };
  const host = {
    switchToHttp: () => ({ getResponse: () => response }),
  } as unknown as ArgumentsHost;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(Logger.prototype, 'error').mockImplementation(logError);
    response.status.mockReturnValue(response);
    filter = new GlobalExceptionFilter();
  });

  afterEach(() => vi.restoreAllMocks());

  it.each(['ECONNREFUSED', 'ECONNRESET', 'EPIPE'])(
    '%s bağlantı hatasını 503 olarak döndürür',
    (code) => {
      filter.catch(Object.assign(new Error('bağlantı hatası'), { code }), host);
      expect(response.status).toHaveBeenCalledWith(503);
      expect(response.json).toHaveBeenCalledWith({
        statusCode: 503,
        message: 'Servise şu anda ulaşılamıyor',
      });
    },
  );

  it('kurulmuş TCP bağlantısı kapanınca 500 yerine 503 döndürür', () => {
    filter.catch(new Error('Connection closed'), host);
    expect(response.status).toHaveBeenCalledWith(503);
  });

  it.each([404, 409])(
    'doğrudan gelen microservice hatasının %s kodunu ve mesajını korur',
    (statusCode) => {
      filter.catch({ statusCode, message: 'Personel işlemi reddedildi' }, host);
      expect(response.status).toHaveBeenCalledWith(statusCode);
      expect(response.json).toHaveBeenCalledWith({
        statusCode,
        message: 'Personel işlemi reddedildi',
      });
    },
  );

  it('error alanında taşınan microservice hatasını da tanır', () => {
    filter.catch(
      { error: { statusCode: 409, message: 'Sicil kullanılıyor' } },
      host,
    );
    expect(response.status).toHaveBeenCalledWith(409);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: 409,
      message: 'Sicil kullanılıyor',
    });
  });

  it('DTO doğrulamasındaki mesaj listesini ve 400 kodunu korur', () => {
    filter.catch(new BadRequestException(['Telefon hatalı']), host);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: 400,
      message: ['Telefon hatalı'],
    });
  });

  it('metin gövdeli HTTP hatasının kodunu ve mesajını korur', () => {
    filter.catch(new HttpException('Personel bulunamadı', 404), host);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: 404,
      message: 'Personel bulunamadı',
    });
  });

  it('microservice hata mesajı liste olduğunda listeyi korur', () => {
    filter.catch({ statusCode: 409, message: ['Sicil kullanılıyor'] }, host);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: 409,
      message: ['Sicil kullanılıyor'],
    });
  });

  it('HTTP hata mesajı metin veya metin listesi değilse genel mesajı kullanır', () => {
    filter.catch(new HttpException({ message: { field: 'name' } }, 400), host);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: 400,
      message: 'Beklenmeyen bir hata oluştu',
    });
  });

  it('beklenmeyen hatayı loglar, ayrıntısını istemciye sızdırmaz', () => {
    filter.catch(new Error('veritabanı iç ayrıntısı'), host);
    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: 500,
      message: 'Beklenmeyen bir hata oluştu',
    });
    expect(logError).toHaveBeenCalled();
  });
  it('500 logunda aynı kimlik bulunur, ham hata ve hassas değerler bulunmaz', () => {
    requestContext.run({ correlationId: 'unexpected-23' }, () => {
      filter.catch(
        new Error('password=secret token=hidden phone=5321234567'),
        host,
      );
    });
    expect(JSON.parse(logError.mock.calls[0][0] as string)).toMatchObject({
      correlationId: 'unexpected-23',
      statusCode: 500,
    });
    expect(JSON.stringify(logError.mock.calls)).not.toMatch(
      /secret|hidden|5321234567/,
    );
  });
  it.each(['direct', 'nested', 'http'] as const)(
    '%s hata biçiminde opsiyonel details alanını korur',
    (kind) => {
      const details = [
        {
          workforceUserId: 7,
          registrationNumber: 'P007',
          firstName: 'Deniz',
          lastName: 'Kaya',
        },
      ];
      const error = { statusCode: 409, message: 'Çakışma var', details };
      filter.catch(
        kind === 'direct'
          ? error
          : kind === 'nested'
            ? { error }
            : new HttpException(error, 409),
        host,
      );
      expect(response.json).toHaveBeenCalledWith(error);
      expect(logError).not.toHaveBeenCalled();
    },
  );

  it('beklenmeyen hata veya bağlantı hatasındaki details bilgisini sızdırmaz', () => {
    filter.catch(
      Object.assign(new Error('internal'), { details: ['private'] }),
      host,
    );
    expect(response.json).toHaveBeenLastCalledWith({
      statusCode: 500,
      message: 'Beklenmeyen bir hata oluştu',
    });
    filter.catch({ code: 'ECONNREFUSED', details: ['private'] }, host);
    expect(response.json).toHaveBeenLastCalledWith({
      statusCode: 503,
      message: 'Servise şu anda ulaşılamıyor',
    });
  });
});