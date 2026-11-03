import { Test } from '@nestjs/testing';
import { firstValueFrom, of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { WorkforceUsersController } from './workforce_users.controller.js';
import { UpdateWorkforceUserDto } from './dto/update-workforce_user.dto.js';

describe('WorkforceUsersController (API)', () => {
  let controller: WorkforceUsersController;
  const client = { send: vi.fn() };

  beforeEach(async () => {
    vi.resetAllMocks();
    const module = await Test.createTestingModule({
      controllers: [WorkforceUsersController],
      providers: [{ provide: 'WORKFORCE_SERVICE', useValue: client }],
    }).compile();
    controller = module.get(WorkforceUsersController);
  });

  it('oluşturma DTO’sunu createWorkforceUser mesajıyla gönderip yanıtı döndürür', async () => {
    const dto = {
      firstName: 'Deniz',
      lastName: 'Kaya',
      registrationNumber: 'P1001',
    };
    const result = { id: 1, ...dto };
    client.send.mockReturnValue(of(result));
    expect(await firstValueFrom(controller.create(dto))).toEqual(result);
    expect(client.send).toHaveBeenCalledWith('createWorkforceUser', dto);
  });

  it('liste parametrelerini false filtresiyle birlikte gönderir', async () => {
    const query = { page: 2, limit: 20, search: 'Kaya', isActive: false };
    const result = { data: [], total: 0, page: 2, limit: 20 };
    client.send.mockReturnValue(of(result));
    expect(await firstValueFrom(controller.findAll(query))).toEqual(result);
    expect(client.send).toHaveBeenCalledWith('findAllWorkforceUsers', query);
  });

  it('detay için sayısal kimliği doğrudan gönderir', async () => {
    client.send.mockReturnValue(of({ id: 1 }));
    expect(await firstValueFrom(controller.findOne(1))).toEqual({ id: 1 });
    expect(client.send).toHaveBeenCalledWith('findOneWorkforceUser', 1);
  });

  it('güncelleme alanlarını adres kimliğiyle gönderir ve false değerini korur', async () => {
    const dto: UpdateWorkforceUserDto = { isActive: false };
    client.send.mockReturnValue(of({ id: 1, isActive: false }));
    expect(await firstValueFrom(controller.update(1, dto))).toEqual({
      id: 1,
      isActive: false,
    });
    expect(client.send).toHaveBeenCalledWith('updateWorkforceUser', {
      id: 1,
      firstName: undefined,
      lastName: undefined,
      registrationNumber: undefined,
      phone: undefined,
      isActive: false,
    });
  });

  it('body içine eklenen bir kimliğin adres kimliğini değiştirmesine izin vermez', async () => {
    const dto = Object.assign(new UpdateWorkforceUserDto(), {
      id: 999,
      firstName: 'Deniz',
    });
    client.send.mockReturnValue(of({ id: 1, firstName: 'Deniz' }));
    await firstValueFrom(controller.update(1, dto));
    expect(client.send).toHaveBeenCalledWith(
      'updateWorkforceUser',
      expect.objectContaining({ id: 1, firstName: 'Deniz' }),
    );
  });

  it('silme kimliğini gönderir ve HTTP için yanıt gövdesini boşaltır', async () => {
    client.send.mockReturnValue(of({ deleted: true, id: 1 }));
    expect(await firstValueFrom(controller.remove(1))).toBeUndefined();
    expect(client.send).toHaveBeenCalledWith('removeWorkforceUser', 1);
  });

  it('servis hatasını başarı yanıtına dönüştürmeden filtreye bırakır', async () => {
    const error = { statusCode: 409, message: 'Sicil kullanılıyor' };
    client.send.mockReturnValue(throwError(() => error));
    await expect(
      firstValueFrom(controller.update(1, { registrationNumber: 'P1001' })),
    ).rejects.toBe(error);
  });

  it('silme hatasını boş başarılı yanıta çevirmeden iletir', async () => {
    const error = { statusCode: 404, message: 'Personel bulunamadı' };
    client.send.mockReturnValue(throwError(() => error));
    await expect(firstValueFrom(controller.remove(999))).rejects.toBe(error);
  });
});