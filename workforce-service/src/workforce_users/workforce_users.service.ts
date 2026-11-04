import { HttpStatus, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, QueryFailedError, Repository } from 'typeorm';
import { CreateWorkforceUserDto } from './dto/create-workforce_user.dto.js';
import { QueryWorkforceUsersDto } from './dto/query-workforce_users.dto.js';
import { UpdateWorkforceUserDto } from './dto/update-workforce_user.dto.js';
import { WorkforceUser } from './entities/workforce_user.entity.js';
import { Team } from '../teams/entities/team.entity.js';

// İlişkili ekibin yalnızca kimliği ve adı dışarı çıkar.
const personSelect = {
  id: true,
  firstName: true,
  lastName: true,
  registrationNumber: true,
  phone: true,
  isActive: true,
  teamId: true,
  createdAt: true,
  updatedAt: true,
  team: { id: true, name: true },
} as const;

@Injectable()
export class WorkforceUsersService {
  constructor(
    @InjectRepository(WorkforceUser)
    private readonly workforceUserRepository: Repository<WorkforceUser>,
  ) {}

  async create(
    createWorkforceUserDto: CreateWorkforceUserDto,
  ): Promise<WorkforceUser> {
    // 1. Aynı sicil numarasına sahip bir personel var mı kontrol et
    const existingWorkforceUser = await this.workforceUserRepository.findOne({
      where: { registrationNumber: createWorkforceUserDto.registrationNumber },
    });

    // 2. Varsa GlobalExceptionFilter'ın beklediği formatta 409 fırlat
    if (existingWorkforceUser) {
      throw new RpcException({
        statusCode: HttpStatus.CONFLICT, // 409
        message: 'Bu sicil numarasıyla kayıtlı bir personel zaten var.',
      });
    }

    // 3. Yoksa personeli oluştur ve veritabanına kaydet
    const newWorkforceUser = this.workforceUserRepository.create({
      firstName: createWorkforceUserDto.firstName,
      lastName: createWorkforceUserDto.lastName,
      registrationNumber: createWorkforceUserDto.registrationNumber,
      phone: createWorkforceUserDto.phone ?? null,
      teamId: null,
      team: null,
    });

    return this.saveWorkforceUser(newWorkforceUser);
  }

  async findAll(queryWorkforceUsersDto: QueryWorkforceUsersDto = {}): Promise<{
    data: WorkforceUser[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = queryWorkforceUsersDto.page ?? 1;
    const limit = queryWorkforceUsersDto.limit ?? 10;
    const { search, isActive } = queryWorkforceUsersDto;

    // 1. Dinamik filtre (where) koşullarını hazırla
    const activeFilter: FindOptionsWhere<WorkforceUser> =
      isActive === undefined ? {} : { isActive };
    const searchText = search?.trim();
    // Dizi elemanları OR, eleman içindeki alanlar AND ile birleşir.
    // Aktiflik filtresi tüm arama dallarına uygulanır.
    const where:
      FindOptionsWhere<WorkforceUser> | FindOptionsWhere<WorkforceUser>[] =
      searchText
        ? [
            { ...activeFilter, firstName: ILike(`%${searchText}%`) },
            { ...activeFilter, lastName: ILike(`%${searchText}%`) },
            { ...activeFilter, registrationNumber: ILike(`%${searchText}%`) },
          ]
        : activeFilter;

    // 2. Kayıtları ve filtreye uyan toplam sayıyı (total) tek sorguda çek
    const [data, total] = await this.workforceUserRepository.findAndCount({
      where,
      relations: { team: true },
      select: personSelect,
      order: {
        createdAt: 'DESC', // En yeniden eskiye sıralama
        id: 'DESC', // Aynı tarihteki kayıtlar için kararlı sayfalama sırası.
      },
      skip: (page - 1) * limit, // Kaç kayıt atlanacak
      take: limit, // Kaç kayıt alınacak
    });

    // 3. P2 yanıt biçiminde dön
    return {
      data,
      total,
      page,
      limit,
    };
  }

  async findOne(id: number): Promise<WorkforceUser> {
    // 1. ID ile personeli veritabanında ara
    const workforceUser = await this.workforceUserRepository.findOne({
      where: { id },
      relations: { team: true },
      select: personSelect,
    });

    // 2. Yoksa GlobalExceptionFilter'ın beklediği formatta 404 fırlat
    if (!workforceUser) {
      throw new RpcException({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Personel bulunamadı.',
      });
    }

    // 3. Varsa personeli dön
    return workforceUser;
  }

  async update(
    id: number,
    updateWorkforceUserDto: UpdateWorkforceUserDto,
  ): Promise<WorkforceUser> {
    // Üyelik işlemleriyle aynı personel kilidini kullanır. Normal bir profil
    // güncellemesi eşzamanlı atamanın team_id değerini geri ezemez.
    return this.workforceUserRepository.manager.transaction(async (manager) => {
      const repository = manager.getRepository(WorkforceUser);
      // 1. Personeli kilitleyerek getir; yoksa 404 döndür.
      const workforceUser = await repository.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!workforceUser) {
        throw new RpcException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Personel bulunamadı.',
        });
      }

      // 2. Sicil değişiyorsa yeni değerin başka personelde kullanılmadığını doğrula.
      if (
        updateWorkforceUserDto.registrationNumber !== undefined &&
        updateWorkforceUserDto.registrationNumber !==
          workforceUser.registrationNumber
      ) {
        const existingWorkforceUser = await repository.findOne({
          where: {
            registrationNumber: updateWorkforceUserDto.registrationNumber,
          },
        });
        if (existingWorkforceUser) {
          throw new RpcException({
            statusCode: HttpStatus.CONFLICT,
            message: 'Bu sicil numarasıyla kayıtlı bir personel zaten var.',
          });
        }
      }

      // 3. Yalnızca gönderilen (undefined olmayan) alanları güncelle
      if (updateWorkforceUserDto.firstName !== undefined) {
        workforceUser.firstName = updateWorkforceUserDto.firstName;
      }
      if (updateWorkforceUserDto.lastName !== undefined) {
        workforceUser.lastName = updateWorkforceUserDto.lastName;
      }
      if (updateWorkforceUserDto.registrationNumber !== undefined) {
        workforceUser.registrationNumber =
          updateWorkforceUserDto.registrationNumber;
      }
      if (updateWorkforceUserDto.phone !== undefined) {
        workforceUser.phone = updateWorkforceUserDto.phone;
      }
      if (updateWorkforceUserDto.isActive !== undefined) {
        workforceUser.isActive = updateWorkforceUserDto.isActive;
      }

      // 4. Kaydet ve güncel personeli dön (save metodu updatedAt alanını otomatik günceller)
      const saved = await this.saveWorkforceUser(workforceUser, repository);
      saved.team =
        saved.teamId === null
          ? null
          : await manager.getRepository(Team).findOne({
              where: { id: saved.teamId },
              select: { id: true, name: true },
            });
      return saved;
    });
  }

  async remove(id: number): Promise<{ deleted: boolean; id: number }> {
    // 1. Personel var mı kontrol et (Yoksa findOne metodu 404 RpcException fırlatır)
    const workforceUser = await this.findOne(id);

    // 2. Varsa veritabanından sil
    await this.workforceUserRepository.remove(workforceUser);

    return { deleted: true, id };
  }

  private async saveWorkforceUser(
    person: WorkforceUser,
    repository: Repository<WorkforceUser> = this.workforceUserRepository,
  ): Promise<WorkforceUser> {
    try {
      return await repository.save(person);
    } catch (error: unknown) {
      // Eşzamanlı istekler ön kontrolden sonra UNIQUE kısıtında çakışabilir.
      if (
        error instanceof QueryFailedError &&
        'code' in error.driverError &&
        error.driverError.code === '23505'
      ) {
        throw new RpcException({
          statusCode: HttpStatus.CONFLICT,
          message: 'Bu sicil numarasıyla kayıtlı bir personel zaten var.',
        });
      }
      throw error;
    }
  }
}