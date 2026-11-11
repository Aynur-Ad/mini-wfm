import { Shift } from '../shifts/entities/shift.entity.js';
import { HttpStatus } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ILike, QueryFailedError } from 'typeorm';
import { vi } from 'vitest';
import { WorkforceUser } from './entities/workforce_user.entity.js';
import { WorkforceUsersService } from './workforce_users.service.js';
import { Team } from '../teams/entities/team.entity.js';

const conflict = {
  error: {
    statusCode: HttpStatus.CONFLICT,
    message: 'Bu sicil numarasıyla kayıtlı bir personel zaten var.',
  },
};
const notFound = {
  error: { statusCode: HttpStatus.NOT_FOUND, message: 'Personel bulunamadı.' },
};

function person(): WorkforceUser {
  return {
    id: 10,
    firstName: 'Akgün',
    lastName: 'Gökalp',
    registrationNumber: '123456',
    phone: '5551239516',
    isActive: true,
    teamId: null,
    team: null,
    createdAt: new Date('2026-10-15T10:00:00Z'),
    updatedAt: new Date('2026-10-15T10:00:00Z'),
  };
}

function duplicateKeyError() {
  return new QueryFailedError(
    'INSERT',
    [],
    Object.assign(new Error('duplicate key'), { code: '23505' }),
  );
}

describe('WorkforceUsersService', () => {
  let service: WorkforceUsersService;
  let current: WorkforceUser;
  const shiftRepository = { existsBy: vi.fn() };
  const teamRepository = { findOne: vi.fn() };
  const repository = {
    findOne: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
    findAndCount: vi.fn(),
    remove: vi.fn(),
    manager: { transaction: vi.fn() },
  };

  beforeEach(async () => {
    vi.resetAllMocks();
    current = person();
    shiftRepository.existsBy.mockResolvedValue(false);
    repository.manager.transaction.mockImplementation(
      (work: (manager: unknown) => unknown) =>
        work({
          getRepository: (entity: unknown) =>
            entity === Team
              ? teamRepository
              : entity === Shift
                ? shiftRepository
                : repository,
        }),
    );
    const module = await Test.createTestingModule({
      providers: [
        WorkforceUsersService,
        { provide: getRepositoryToken(WorkforceUser), useValue: repository },
      ],
    }).compile();
    service = module.get(WorkforceUsersService);
    repository.save.mockImplementation((value: WorkforceUser) =>
      Promise.resolve(value),
    );
  });

  describe('create', () => {
    const dto = {
      firstName: 'Akgün',
      lastName: 'Gökalp',
      registrationNumber: '123456',
      phone: '5551239516',
    };

    it('yeni personeli sicil kontrolünden sonra oluşturur, kaydeder ve döndürür', async () => {
      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue(current);
      expect(await service.create(dto)).toEqual(current);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { registrationNumber: dto.registrationNumber },
      });
      expect(repository.create).toHaveBeenCalledWith({
        ...dto,
        teamId: null,
        team: null,
      });
      expect(repository.save).toHaveBeenCalledWith(current);
    });

    it('telefon gönderilmezse null ile kayda hazırlar', async () => {
      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue(current);
      await service.create({
        firstName: 'Deniz',
        lastName: 'Kaya',
        registrationNumber: 'P1001',
      });
      expect(repository.create).toHaveBeenCalledWith({
        firstName: 'Deniz',
        lastName: 'Kaya',
        registrationNumber: 'P1001',
        phone: null,
        teamId: null,
        team: null,
      });
    });

    it('sicil kullanılıyorsa 409 fırlatır ve hiçbir kayıt işlemi yapmaz', async () => {
      repository.findOne.mockResolvedValue(current);
      const result = service.create(dto);
      await expect(result).rejects.toBeInstanceOf(RpcException);
      await expect(result).rejects.toMatchObject(conflict);
      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('eşzamanlı kayıtta veritabanı tekillik hatasını da 409 olarak taşır', async () => {
      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue(current);
      repository.save.mockRejectedValue(duplicateKeyError());
      await expect(service.create(dto)).rejects.toMatchObject(conflict);
    });

    it('beklenmeyen kayıt hatasını yanlışlıkla 409 olarak değiştirmez', async () => {
      const error = new Error('database disconnected');
      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue(current);
      repository.save.mockRejectedValue(error);
      await expect(service.create(dto)).rejects.toBe(error);
    });

    it('başka bir PostgreSQL hatasını tekillik çakışması olarak yorumlamaz', async () => {
      const error = new QueryFailedError(
        'INSERT',
        [],
        Object.assign(new Error('not null'), { code: '23502' }),
      );
      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue(current);
      repository.save.mockRejectedValue(error);
      await expect(service.create(dto)).rejects.toBe(error);
    });
  });

  describe('findOne', () => {
    it('personeli istenen kimlikle arar ve döndürür', async () => {
      repository.findOne.mockResolvedValue(current);
      expect(await service.findOne(10)).toEqual(current);
      expect(repository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 10 },
          relations: { team: true },
          select: expect.objectContaining({ team: { id: true, name: true } }),
        }),
      );
    });

    it('personel yoksa 404 fırlatır', async () => {
      repository.findOne.mockResolvedValue(null);
      await expect(service.findOne(999)).rejects.toMatchObject(notFound);
    });
  });

  describe('findAll', () => {
    it('varsayılan ilk sayfayı ve filtreye uyan toplamı döndürür', async () => {
      repository.findAndCount.mockResolvedValue([[current], 25]);
      expect(await service.findAll()).toEqual({
        data: [current],
        total: 25,
        page: 1,
        limit: 10,
      });
      expect(repository.findAndCount).toHaveBeenCalledWith({
        relations: { team: true },
        select: expect.objectContaining({ team: { id: true, name: true } }),
        where: {},
        order: { createdAt: 'DESC', id: 'DESC' },
        skip: 0,
        take: 10,
      });
    });

    it('ad VE soyad yerine ad VEYA soyad VEYA sicil arar; durum filtresini her dala uygular', async () => {
      repository.findAndCount.mockResolvedValue([[current], 11]);
      expect(
        await service.findAll({
          page: 2,
          limit: 5,
          search: '  gün  ',
          isActive: false,
        }),
      ).toEqual({ data: [current], total: 11, page: 2, limit: 5 });
      expect(repository.findAndCount).toHaveBeenCalledWith({
        relations: { team: true },
        select: expect.objectContaining({ team: { id: true, name: true } }),
        where: [
          { isActive: false, firstName: ILike('%gün%') },
          { isActive: false, lastName: ILike('%gün%') },
          { isActive: false, registrationNumber: ILike('%gün%') },
        ],
        order: { createdAt: 'DESC', id: 'DESC' },
        skip: 5,
        take: 5,
      });
    });

    it('arama olmadan false filtresini korur ve boş sayfada toplamı sıfırlamaz', async () => {
      repository.findAndCount.mockResolvedValue([[], 3]);
      expect(
        await service.findAll({ page: 2, limit: 10, isActive: false }),
      ).toEqual({ data: [], total: 3, page: 2, limit: 10 });
      expect(repository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isActive: false }, skip: 10 }),
      );
    });

    it('yalnızca boşluk içeren aramayı filtre olarak kullanmaz', async () => {
      repository.findAndCount.mockResolvedValue([[], 0]);
      await service.findAll({ search: '   ' });
      expect(repository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
    });

    it('durum seçilmemiş aramada aktiflik filtresi eklemez', async () => {
      repository.findAndCount.mockResolvedValue([[current], 1]);
      await service.findAll({ search: '123' });
      expect(repository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: [
            { firstName: ILike('%123%') },
            { lastName: ILike('%123%') },
            { registrationNumber: ILike('%123%') },
          ],
        }),
      );
    });
  });

  describe('update', () => {
    it('atanmış personeli güncellerken üyeliği korur ve ekip özetini döndürür', async () => {
      current.teamId = 3;
      repository.findOne.mockResolvedValue(current);
      teamRepository.findOne.mockResolvedValue({ id: 3, name: 'Saha Ekibi' });
      const result = await service.update(10, { id: 10, lastName: 'Yeni' });
      expect(result.teamId).toBe(3);
      expect(result.team).toEqual({ id: 3, name: 'Saha Ekibi' });
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 10 },
        lock: { mode: 'pessimistic_write' },
      });
      expect(teamRepository.findOne).toHaveBeenCalledWith({
        where: { id: 3 },
        select: { id: true, name: true },
      });
    });

    it('yalnızca gönderilen telefonu değiştirir, diğer alanları korur', async () => {
      repository.findOne.mockResolvedValue(current);
      const result = await service.update(10, { id: 10, phone: '5321234567' });
      expect(result).toEqual(Object.assign(person(), { phone: '5321234567' }));
      expect(repository.findOne).toHaveBeenCalledTimes(1);
      expect(repository.save).toHaveBeenCalledWith(result);
    });

    it('false değerini gönderilmemiş saymaz ve personeli pasife alır', async () => {
      repository.findOne.mockResolvedValue(current);
      expect(
        (await service.update(10, { id: 10, isActive: false })).isActive,
      ).toBe(false);
    });

    it('personelin kendi sicilini tekrar göndermesine izin verir', async () => {
      repository.findOne.mockResolvedValue(current);
      await service.update(10, {
        id: 10,
        registrationNumber: current.registrationNumber,
      });
      expect(repository.findOne).toHaveBeenCalledTimes(1);
      expect(repository.save).toHaveBeenCalledOnce();
    });

    it('ad değişikliğinde ad tekilliği aramaz', async () => {
      repository.findOne.mockResolvedValue(current);
      expect(
        (await service.update(10, { id: 10, firstName: 'Deniz' })).firstName,
      ).toBe('Deniz');
      expect(repository.findOne).toHaveBeenCalledTimes(1);
    });

    it('yeni sicil kullanılmıyorsa sicili değiştirir', async () => {
      repository.findOne
        .mockResolvedValueOnce(current)
        .mockResolvedValueOnce(null);
      const result = await service.update(10, {
        id: 10,
        registrationNumber: 'NEW001',
      });
      expect(repository.findOne).toHaveBeenNthCalledWith(2, {
        where: { registrationNumber: 'NEW001' },
      });
      expect(result.registrationNumber).toBe('NEW001');
    });

    it('başka personelin sicili verilirse 409 fırlatır ve mevcut kaydı değiştirmez', async () => {
      repository.findOne
        .mockResolvedValueOnce(current)
        .mockResolvedValueOnce(
          Object.assign(person(), { id: 20, registrationNumber: 'OTHER' }),
        );
      await expect(
        service.update(10, {
          id: 10,
          registrationNumber: 'OTHER',
          firstName: 'Yeni',
        }),
      ).rejects.toMatchObject(conflict);
      expect(repository.save).not.toHaveBeenCalled();
      expect(current).toEqual(person());
    });

    it('olmayan personelde 404 fırlatır ve kaydetmez', async () => {
      repository.findOne.mockResolvedValue(null);
      await expect(
        service.update(999, { id: 999, firstName: 'Deniz' }),
      ).rejects.toMatchObject(notFound);
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('telefon null gönderilirse telefonu boşaltır', async () => {
      repository.findOne.mockResolvedValue(current);
      expect(
        (await service.update(10, { id: 10, phone: null })).phone,
      ).toBeNull();
    });

    it('birden fazla alanı günceller ve gönderilmeyen sicili korur', async () => {
      repository.findOne.mockResolvedValue(current);
      expect(
        await service.update(10, {
          id: 10,
          firstName: 'Deniz',
          lastName: 'Kaya',
          isActive: false,
        }),
      ).toEqual(
        Object.assign(person(), {
          firstName: 'Deniz',
          lastName: 'Kaya',
          isActive: false,
        }),
      );
    });

    it('güncelleme sırasında oluşan tekillik yarışını da 409 olarak taşır', async () => {
      repository.findOne
        .mockResolvedValueOnce(current)
        .mockResolvedValueOnce(null);
      repository.save.mockRejectedValue(duplicateKeyError());
      await expect(
        service.update(10, { id: 10, registrationNumber: 'NEW001' }),
      ).rejects.toMatchObject(conflict);
    });
  });

  describe('remove', () => {
    it('vardiyası varsa personeli 409 ile korur', async () => {
      repository.findOne.mockResolvedValue(current);
      shiftRepository.existsBy.mockResolvedValue(true);
      await expect(service.remove(10)).rejects.toMatchObject({
        error: {
          statusCode: 409,
          message: 'Vardiyası olan personel silinemez',
        },
      });
      expect(repository.remove).not.toHaveBeenCalled();
    });

    it('FK yarışını da 409 olarak döndürür', async () => {
      repository.findOne.mockResolvedValue(current);
      repository.remove.mockRejectedValue(
        new QueryFailedError(
          'DELETE',
          [],
          Object.assign(new Error('fk'), {
            code: '23503',
            constraint: 'FK_shift_workforce_user',
          }),
        ),
      );
      await expect(service.remove(10)).rejects.toMatchObject({
        error: { statusCode: 409 },
      });
    });

    it('mevcut personeli siler ve mevcut TCP yanıt biçimini korur', async () => {
      repository.findOne.mockResolvedValue(current);
      repository.remove.mockResolvedValue(current);
      expect(await service.remove(10)).toEqual({ deleted: true, id: 10 });
      expect(repository.remove).toHaveBeenCalledWith(current);
    });

    it('olmayan personelde 404 verir ve silme çağrısı yapmaz', async () => {
      repository.findOne.mockResolvedValue(null);
      await expect(service.remove(999)).rejects.toMatchObject(notFound);
      expect(repository.remove).not.toHaveBeenCalled();
    });
  });
});