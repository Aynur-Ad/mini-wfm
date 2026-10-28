import { HttpStatus } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ILike } from 'typeorm';
import { vi } from 'vitest';
import { WorkforceUser } from './entities/workforce_user.entity.js';
import { WorkforceUsersService } from './workforce_users.service.js';

describe('WorkforceUsersService', () => {
  let service: WorkforceUsersService;

  // TypeORM Repository metodlarının sahte (mock) karşılıkları
  const mockWorkforceUserRepository = {
    findOne: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
    findAndCount: vi.fn(),
    remove: vi.fn(),
  };

  // Testlerde kullanacağımız örnek personel verisi
  const mockWorkforceUser: WorkforceUser = {
    id: 10,
    firstName: 'Akgün',
    lastName: 'Gökalp',
    registrationNumber: '123456',
    phone: '5551239516',
    isActive: true,
    createdAt: new Date('2026-10-15T10:00:00Z'),
    updatedAt: new Date('2026-10-15T10:00:00Z'),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkforceUsersService,
        {
          provide: getRepositoryToken(WorkforceUser),
          useValue: mockWorkforceUserRepository,
        },
      ],
    }).compile();

    service = module.get<WorkforceUsersService>(WorkforceUsersService);
  });

  describe('create', () => {
    it('yeni bir personel oluşturur ve kaydeder', async () => {
      const dto = {
        firstName: 'Akgün',
        lastName: 'Gökalp',
        registrationNumber: '123456',
        phone: '5551239516',
      };
      mockWorkforceUserRepository.findOne.mockResolvedValue(null);
      mockWorkforceUserRepository.create.mockReturnValue(mockWorkforceUser);
      mockWorkforceUserRepository.save.mockResolvedValue(mockWorkforceUser);

      const result = await service.create(dto);

      expect(mockWorkforceUserRepository.findOne).toHaveBeenCalledWith({
        where: { registrationNumber: dto.registrationNumber },
      });
      expect(mockWorkforceUserRepository.create).toHaveBeenCalledWith({
        firstName: dto.firstName,
        lastName: dto.lastName,
        registrationNumber: dto.registrationNumber,
        phone: dto.phone,
      });
      expect(mockWorkforceUserRepository.save).toHaveBeenCalledWith(
        mockWorkforceUser,
      );
      expect(result).toEqual(mockWorkforceUser);
    });

    it('aynı kayıt numarasına sahip personel varsa 409 fırlatır ve veritabanına kaydetme çağrısı yapmaz', async () => {
      const dto = {
        firstName: 'Akgün',
        lastName: 'Gökalp',
        registrationNumber: '123456',
      };
      mockWorkforceUserRepository.findOne.mockResolvedValue(mockWorkforceUser);

      await expect(service.create(dto)).rejects.toThrow(RpcException);
      await expect(service.create(dto)).rejects.toMatchObject({
        error: {
          statusCode: HttpStatus.CONFLICT,
        },
      });

      expect(mockWorkforceUserRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('personel bulunduğunda personel detayını döner', async () => {
      mockWorkforceUserRepository.findOne.mockResolvedValue(mockWorkforceUser);

      const result = await service.findOne(1);

      expect(mockWorkforceUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toEqual(mockWorkforceUser);
    });

    it('personel bulunamadığında 404 fırlatır', async () => {
      mockWorkforceUserRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(RpcException);
      await expect(service.findOne(999)).rejects.toMatchObject({
        error: {
          statusCode: HttpStatus.NOT_FOUND,
        },
      });
    });
  });
});
