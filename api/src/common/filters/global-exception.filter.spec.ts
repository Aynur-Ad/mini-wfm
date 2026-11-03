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
  const logError = vi.fn(() => undefined);
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

  it('beklenmeyen hatayı loglar, ayrıntısını istemciye sızdırmaz', () => {
    filter.catch(new Error('veritabanı iç ayrıntısı'), host);
    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: 500,
      message: 'Beklenmeyen bir hata oluştu',
    });
    expect(logError).toHaveBeenCalled();
  });
});