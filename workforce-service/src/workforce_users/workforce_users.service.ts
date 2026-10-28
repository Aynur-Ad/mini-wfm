import { HttpStatus, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, Repository } from 'typeorm';
import { CreateWorkforceUserDto } from './dto/create-workforce_user.dto.js';
import { QueryWorkforceUsersDto } from './dto/query-workforce_users.dto.js';
import { UpdateWorkforceUserDto } from './dto/update-workforce_user.dto.js';
import { WorkforceUser } from './entities/workforce_user.entity.js';

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
    });

    return await this.workforceUserRepository.save(newWorkforceUser);
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
    const where: FindOptionsWhere<WorkforceUser> = {};

    if (search !== undefined && search.trim() !== '') {
      where.firstName = ILike(`%${search.trim()}%`);
      where.lastName = ILike(`%${search.trim()}%`);
      where.registrationNumber = ILike(`%${search.trim()}%`);
      where.phone = ILike(`%${search.trim()}%`);
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    // 2. Kayıtları ve filtreye uyan toplam sayıyı (total) tek sorguda çek
    const [data, total] = await this.workforceUserRepository.findAndCount({
      where,
      order: {
        createdAt: 'DESC', // En yeniden eskiye sıralama
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

  async update(id: number, updateWorkforceUserDto: UpdateWorkforceUserDto): Promise<WorkforceUser> {
      // 1. Personel var mı kontrol et (Yoksa findOne metodu 404 RpcException fırlatır)
      const workforceUser = await this.findOne(id);
  
      // 2. Ad değiştiriliyorsa (name gönderilmiş ve mevcut addan farklıysa)
      if (updateWorkforceUserDto.firstName !== undefined && updateWorkforceUserDto.firstName !== workforceUser.firstName) {
        const existingWorkforceUser = await this.workforceUserRepository.findOne({
          where: { firstName: updateWorkforceUserDto.firstName },
        });
      }
  
      // 3. Yalnızca gönderilen (undefined olmayan) alanları güncelle
      if (updateWorkforceUserDto.firstName !== undefined) {
        workforceUser.firstName = updateWorkforceUserDto.firstName;
      }
      if (updateWorkforceUserDto.lastName !== undefined) {
        workforceUser.lastName = updateWorkforceUserDto.lastName;
      }
      if (updateWorkforceUserDto.registrationNumber !== undefined) {
        workforceUser.registrationNumber = updateWorkforceUserDto.registrationNumber;
      }
      if (updateWorkforceUserDto.phone !== undefined) {
        workforceUser.phone = updateWorkforceUserDto.phone;
      }
      if (updateWorkforceUserDto.isActive !== undefined) {
        workforceUser.isActive = updateWorkforceUserDto.isActive;
      }
  
      // 4. Kaydet ve güncel personeli dön (save metodu updatedAt alanını otomatik günceller)
      return await this.workforceUserRepository.save(workforceUser);
    }

  async remove(id: number): Promise<{ deleted: boolean; id: number }> {
    // 1. Personel var mı kontrol et (Yoksa findOne metodu 404 RpcException fırlatır)
    const workforceUser = await this.findOne(id);

    // 2. Varsa veritabanından sil
    await this.workforceUserRepository.remove(workforceUser);

    return { deleted: true, id };
  }
}
