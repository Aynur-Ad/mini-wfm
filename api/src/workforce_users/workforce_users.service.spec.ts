import { Test } from '@nestjs/testing';
import { firstValueFrom, of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { WorkforceUsersService } from './workforce_users.service.js';
import { CreateWorkforceUserDto } from './dto/create-workforce_user.dto.js';
import { QueryWorkforceUsersDto } from './dto/query-workforce_users.dto.js';
import { UpdateWorkforceUserDto } from './dto/update-workforce_user.dto.js';

describe('WorkforceUsersService (API)', () => {
  let service: WorkforceUsersService;
  const client = { send: vi.fn() };

  beforeEach(async () => {
    vi.resetAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        WorkforceUsersService,
        { provide: 'WORKFORCE_SERVICE', useValue: client },
      ],
    }).compile();
    service = module.get(WorkforceUsersService);
  });

  it('oluşturma DTO verisini createWorkforceUser mesajıyla gönderir', async () => {
    const dto: CreateWorkforceUserDto = {
      firstName: 'Deniz',
      lastName: 'Kaya',
      registrationNumber: 'P1001',
    };
    const response = Object.assign({ id: 1 }, dto);
    client.send.mockReturnValue(of(response));
    expect(await firstValueFrom(service.create(dto))).toEqual(response);
    expect(client.send).toHaveBeenCalledWith('createWorkforceUser', dto);
  });

  it('liste parametrelerini ve false filtresini findAllWorkforceUsers mesajıyla gönderir', async () => {
    const query: QueryWorkforceUsersDto = {
      page: 2,
      limit: 20,
      search: 'Kaya',
      isActive: false,
    };
    const response = { data: [], total: 0, page: 2, limit: 20 };
    client.send.mockReturnValue(of(response));
    expect(await firstValueFrom(service.findAll(query))).toEqual(response);
    expect(client.send).toHaveBeenCalledWith('findAllWorkforceUsers', query);
  });

  it('detay kimliğini findOneWorkforceUser mesajıyla gönderir', async () => {
    client.send.mockReturnValue(of({ id: 1 }));
    expect(await firstValueFrom(service.findOne(1))).toEqual({ id: 1 });
    expect(client.send).toHaveBeenCalledWith('findOneWorkforceUser', 1);
  });

  it('güncellemede false ve telefonu temizleyen null değerini korur', async () => {
    const dto: UpdateWorkforceUserDto = { isActive: false, phone: null };
    const response = { id: 1, isActive: false, phone: null };
    client.send.mockReturnValue(of(response));
    expect(await firstValueFrom(service.update(1, dto))).toEqual(response);
    expect(client.send).toHaveBeenCalledWith('updateWorkforceUser', {
      firstName: undefined,
      lastName: undefined,
      registrationNumber: undefined,
      phone: null,
      isActive: false,
      id: 1,
    });
  });

  it('body kimliğini kullanmaz ve teamId alanını profil güncellemesine taşımaz', async () => {
    const dto = Object.assign(new UpdateWorkforceUserDto(), {
      id: 999,
      teamId: 7,
      firstName: 'Deniz',
    });
    client.send.mockReturnValue(of({ id: 1, firstName: 'Deniz' }));
    await firstValueFrom(service.update(1, dto));
    expect(client.send).toHaveBeenCalledWith('updateWorkforceUser', {
      firstName: 'Deniz',
      lastName: undefined,
      registrationNumber: undefined,
      phone: undefined,
      isActive: undefined,
      id: 1,
    });
    expect(dto.id).toBe(999);
  });

  it('silme kimliğini removeWorkforceUser mesajıyla gönderir', async () => {
    const response = { deleted: true, id: 1 };
    client.send.mockReturnValue(of(response));
    expect(await firstValueFrom(service.remove(1))).toEqual(response);
    expect(client.send).toHaveBeenCalledWith('removeWorkforceUser', 1);
  });

  it.each([404, 409])(
    '%s microservice hatasını değiştirmeden iletir',
    async (statusCode) => {
      const error = { statusCode, message: 'Personel işlemi reddedildi' };
      client.send.mockReturnValue(throwError(() => error));
      await expect(firstValueFrom(service.update(1, {}))).rejects.toBe(error);
    },
  );
});