import { HttpStatus } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ILike } from 'typeorm';
import { vi } from 'vitest';
import { Team } from './entities/team.entity.js';
import { TeamsService } from './teams.service.js';

describe('TeamsService', () => {
  let service: TeamsService;

  // TypeORM Repository metodlarının sahte (mock) karşılıkları
  const mockTeamRepository = {
    findOne: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
    findAndCount: vi.fn(),
    remove: vi.fn(),
  };

  // Testlerde kullanacağımız örnek ekip verisi
  const mockTeam: Team = {
    id: 1,
    name: 'Backend Ekibi',
    description: 'Mikroservis geliştirme ekibi',
    isActive: true,
    createdAt: new Date('2026-10-15T10:00:00Z'),
    updatedAt: new Date('2026-10-15T10:00:00Z'),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamsService,
        {
          provide: getRepositoryToken(Team),
          useValue: mockTeamRepository,
        },
      ],
    }).compile();

    service = module.get<TeamsService>(TeamsService);
  });

  describe('create', () => {
    it('yeni bir ekibi başarıyla oluşturur ve kaydeder', async () => {
      const dto = {
        name: 'Backend Ekibi',
        description: 'Mikroservis geliştirme ekibi',
      };
      mockTeamRepository.findOne.mockResolvedValue(null);
      mockTeamRepository.create.mockReturnValue(mockTeam);
      mockTeamRepository.save.mockResolvedValue(mockTeam);

      const result = await service.create(dto);

      expect(mockTeamRepository.findOne).toHaveBeenCalledWith({
        where: { name: dto.name },
      });
      expect(mockTeamRepository.create).toHaveBeenCalledWith({
        name: dto.name,
        description: dto.description,
      });
      expect(mockTeamRepository.save).toHaveBeenCalledWith(mockTeam);
      expect(result).toEqual(mockTeam);
    });

    it('aynı isimde ekip varsa 409 fırlatır ve veritabanına kaydetme çağrısı yapmaz', async () => {
      const dto = { name: 'Backend Ekibi' };
      mockTeamRepository.findOne.mockResolvedValue(mockTeam);

      await expect(service.create(dto)).rejects.toThrow(RpcException);
      await expect(service.create(dto)).rejects.toMatchObject({
        error: {
          statusCode: HttpStatus.CONFLICT,
        },
      });

      expect(mockTeamRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('varsayılan sayfalama değerleriyle ekipleri en yeniden eskiye sıralı döner', async () => {
      mockTeamRepository.findAndCount.mockResolvedValue([[mockTeam], 1]);

      const result = await service.findAll({});

      expect(mockTeamRepository.findAndCount).toHaveBeenCalledWith({
        where: {},
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 10,
      });
      expect(result).toEqual({
        data: [mockTeam],
        total: 1,
        page: 1,
        limit: 10,
      });
    });

    it('search, isActive, page ve limit filtrelerini birlikte uygular', async () => {
      mockTeamRepository.findAndCount.mockResolvedValue([[mockTeam], 1]);

      const result = await service.findAll({
        page: 2,
        limit: 5,
        search: 'Back',
        isActive: true,
      });

      expect(mockTeamRepository.findAndCount).toHaveBeenCalledWith({
        where: {
          name: ILike('%Back%'),
          isActive: true,
        },
        order: { createdAt: 'DESC' },
        skip: 5, // (2 - 1) * 5
        take: 5,
      });
      expect(result).toEqual({
        data: [mockTeam],
        total: 1,
        page: 2,
        limit: 5,
      });
    });
  });

  describe('findOne', () => {
    it('ekip bulunduğunda ekip detayını döner', async () => {
      mockTeamRepository.findOne.mockResolvedValue(mockTeam);

      const result = await service.findOne(1);

      expect(mockTeamRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toEqual(mockTeam);
    });

    it('ekip bulunamadığında 404 fırlatır', async () => {
      mockTeamRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(RpcException);
      await expect(service.findOne(999)).rejects.toMatchObject({
        error: {
          statusCode: HttpStatus.NOT_FOUND,
        },
      });
    });
  });

  describe('update', () => {
    it('yalnızca gönderilen alanları günceller ve kaydeder', async () => {
      const existingTeam = { ...mockTeam };
      const updatedTeam = {
        ...mockTeam,
        description: 'Yeni açıklama',
        isActive: false,
      };

      mockTeamRepository.findOne.mockResolvedValue(existingTeam);
      mockTeamRepository.save.mockResolvedValue(updatedTeam);

      const result = await service.update(1, {
        id: 1,
        description: 'Yeni açıklama',
        isActive: false,
      });

      expect(mockTeamRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Backend Ekibi', // Ad değişmedi
          description: 'Yeni açıklama',
          isActive: false,
        }),
      );
      expect(result).toEqual(updatedTeam);
    });

    it('ekibin kendi adı tekrar gönderilirse 409 fırlatmadan günceller', async () => {
      const existingTeam = { ...mockTeam };
      mockTeamRepository.findOne.mockResolvedValueOnce(existingTeam);
      mockTeamRepository.save.mockResolvedValue(existingTeam);

      const result = await service.update(1, {
        id: 1,
        name: 'Backend Ekibi',
      });

      // İsim aynı olduğu için ikinci bir findOne (isim çakışma) sorgusu atılmamalı
      expect(mockTeamRepository.findOne).toHaveBeenCalledTimes(1);
      expect(mockTeamRepository.save).toHaveBeenCalled();
      expect(result).toEqual(existingTeam);
    });

    it('güncellenmek istenen ekip yoksa 404 fırlatır ve kaydetme çağrısı yapmaz', async () => {
      mockTeamRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update(999, { id: 999, name: 'Yeni Ad' }),
      ).rejects.toMatchObject({
        error: {
          statusCode: HttpStatus.NOT_FOUND,
        },
      });

      expect(mockTeamRepository.save).not.toHaveBeenCalled();
    });

    it('yeni ad başka bir ekipte varsa 409 fırlatır ve kaydetme çağrısı yapmaz', async () => {
      const existingTeam = { ...mockTeam, id: 1, name: 'Backend Ekibi' };
      const anotherTeam = { ...mockTeam, id: 2, name: 'Frontend Ekibi' };

      // İlk findOne ID ile arar (mevcut ekibi bulur), ikinci findOne isimle arar (başka ekibi bulur)
      mockTeamRepository.findOne
        .mockResolvedValueOnce(existingTeam)
        .mockResolvedValueOnce(anotherTeam);

      await expect(
        service.update(1, { id: 1, name: 'Frontend Ekibi' }),
      ).rejects.toMatchObject({
        error: {
          statusCode: HttpStatus.CONFLICT,
        },
      });

      expect(mockTeamRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('mevcut ekibi başarıyla siler', async () => {
      mockTeamRepository.findOne.mockResolvedValue(mockTeam);
      mockTeamRepository.remove.mockResolvedValue(mockTeam);

      await service.remove(1);

      expect(mockTeamRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(mockTeamRepository.remove).toHaveBeenCalledWith(mockTeam);
    });

    it('silinmek istenen ekip yoksa 404 fırlatır ve silme çağrısı yapmaz', async () => {
      mockTeamRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toMatchObject({
        error: {
          statusCode: HttpStatus.NOT_FOUND,
        },
      });

      expect(mockTeamRepository.remove).not.toHaveBeenCalled();
    });
  });
});
