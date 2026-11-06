import { HTTP_CODE_METADATA } from '@nestjs/common/constants';
import { Test } from '@nestjs/testing';
import { firstValueFrom, of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { WorkforceUsersController } from './workforce_users.controller.js';
import { WorkforceUsersService } from './workforce_users.service.js';
import { CreateWorkforceUserDto } from './dto/create-workforce_user.dto.js';
import { UpdateWorkforceUserDto } from './dto/update-workforce_user.dto.js';

describe('WorkforceUsersController (API)', () => {
  let controller: WorkforceUsersController;
  const service = {
    create: vi.fn(),
    findAll: vi.fn(),
    findOne: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  };

  beforeEach(async () => {
    vi.resetAllMocks();
    const module = await Test.createTestingModule({
      controllers: [WorkforceUsersController],
      providers: [{ provide: WorkforceUsersService, useValue: service }],
    }).compile();
    controller = module.get(WorkforceUsersController);
  });

  it('oluşturma DTO verisini service metoduna aktarır ve yanıtı döndürür', async () => {
    const dto: CreateWorkforceUserDto = {
      firstName: 'Deniz',
      lastName: 'Kaya',
      registrationNumber: 'P1001',
    };
    const result = { id: 1, firstName: 'Deniz' };
    service.create.mockReturnValue(of(result));
    expect(await firstValueFrom(controller.create(dto))).toEqual(result);
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('liste parametrelerini false filtresiyle birlikte service metoduna aktarır', async () => {
    const query = { page: 2, limit: 20, search: 'Kaya', isActive: false };
    const result = { data: [], total: 0, page: 2, limit: 20 };
    service.findAll.mockReturnValue(of(result));
    expect(await firstValueFrom(controller.findAll(query))).toEqual(result);
    expect(service.findAll).toHaveBeenCalledWith(query);
  });

  it('detay için sayısal kimliği service metoduna aktarır', async () => {
    service.findOne.mockReturnValue(of({ id: 1 }));
    expect(await firstValueFrom(controller.findOne(1))).toEqual({ id: 1 });
    expect(service.findOne).toHaveBeenCalledWith(1);
  });

  it('güncellemede adres kimliğini ve DTO verisini ayrı aktarır', async () => {
    const dto: UpdateWorkforceUserDto = { isActive: false, phone: null };
    const result = { id: 1, isActive: false, phone: null };
    service.update.mockReturnValue(of(result));
    expect(await firstValueFrom(controller.update(1, dto))).toEqual(result);
    expect(service.update).toHaveBeenCalledWith(1, dto);
  });

  it('body içinde başka kimlik bulunsa da adres kimliğini ayrı iletir', async () => {
    const dto = Object.assign(new UpdateWorkforceUserDto(), {
      id: 999,
      firstName: 'Deniz',
    });
    service.update.mockReturnValue(of({ id: 1 }));
    await firstValueFrom(controller.update(1, dto));
    expect(service.update).toHaveBeenCalledWith(1, dto);
  });

  it('silme kimliğini aktarır ve HTTP 204 için yanıt gövdesini boşaltır', async () => {
    service.remove.mockReturnValue(of({ deleted: true, id: 1 }));
    expect(await firstValueFrom(controller.remove(1))).toBeUndefined();
    expect(service.remove).toHaveBeenCalledWith(1);
    expect(
      Reflect.getMetadata(
        HTTP_CODE_METADATA,
        Object.getOwnPropertyDescriptor(
          WorkforceUsersController.prototype,
          'remove',
        )?.value,
      ),
    ).toBe(204);
  });

  it('güncelleme hatasını başarı yanıtına dönüştürmeden filtreye bırakır', async () => {
    const error = { statusCode: 409, message: 'Sicil kullanılıyor' };
    service.update.mockReturnValue(throwError(() => error));
    await expect(
      firstValueFrom(controller.update(1, { registrationNumber: 'P1001' })),
    ).rejects.toBe(error);
  });

  it('silme hatasını boş başarılı yanıta çevirmeden iletir', async () => {
    const error = { statusCode: 404, message: 'Personel bulunamadı' };
    service.remove.mockReturnValue(throwError(() => error));
    await expect(firstValueFrom(controller.remove(999))).rejects.toBe(error);
  });
});