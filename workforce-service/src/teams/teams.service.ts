import { HttpStatus, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, Repository } from 'typeorm';
import { CreateTeamDto } from './dto/create-team.dto.js';
import { QueryTeamsDto } from './dto/query-teams.dto.js';
import { UpdateTeamDto } from './dto/update-team.dto.js';
import { Team } from './entities/team.entity.js';

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
  ) {}

  async create(createTeamDto: CreateTeamDto): Promise<Team> {
    // 1. Aynı isimde bir ekip var mı kontrol et
    const existingTeam = await this.teamRepository.findOne({
      where: { name: createTeamDto.name },
    });

    // 2. Varsa GlobalExceptionFilter'ın beklediği formatta 409 fırlat
    if (existingTeam) {
      throw new RpcException({
        statusCode: HttpStatus.CONFLICT, // 409
        message: 'Bu isimde bir ekip zaten var',
      });
    }

    // 3. Yoksa ekibi oluştur ve veritabanına kaydet
    const team = this.teamRepository.create({
      name: createTeamDto.name,
      description: createTeamDto.description ?? null,
    });

    return await this.teamRepository.save(team);
  }

  async findAll(queryTeamsDto: QueryTeamsDto = {}): Promise<{
    data: Team[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = queryTeamsDto.page ?? 1;
    const limit = queryTeamsDto.limit ?? 10;
    const { search, isActive } = queryTeamsDto;

    // 1. Dinamik filtre (where) koşullarını hazırla
    const where: FindOptionsWhere<Team> = {};

    if (search !== undefined && search.trim() !== '') {
      where.name = ILike(`%${search.trim()}%`);
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    // 2. Kayıtları ve filtreye uyan toplam sayıyı (total) tek sorguda çek
    const [data, total] = await this.teamRepository.findAndCount({
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

  async findOne(id: number): Promise<Team> {
    // 1. ID ile ekibi veritabanında ara
    const team = await this.teamRepository.findOne({
      where: { id },
    });

    // 2. Yoksa GlobalExceptionFilter'ın beklediği formatta 404 fırlat
    if (!team) {
      throw new RpcException({
        statusCode: HttpStatus.NOT_FOUND, // 404
        message: 'Ekip bulunamadı',
      });
    }

    // 3. Varsa ekibi dön
    return team;
  }

  async update(id: number, updateTeamDto: UpdateTeamDto): Promise<Team> {
    // 1. Ekip var mı kontrol et (Yoksa findOne metodu 404 RpcException fırlatır)
    const team = await this.findOne(id);

    // 2. Ad değiştiriliyorsa (name gönderilmiş ve mevcut addan farklıysa)
    if (updateTeamDto.name !== undefined && updateTeamDto.name !== team.name) {
      const existingTeam = await this.teamRepository.findOne({
        where: { name: updateTeamDto.name },
      });

      // Bu ad başka bir ekipte varsa 409 Conflict fırlat
      if (existingTeam) {
        throw new RpcException({
          statusCode: HttpStatus.CONFLICT, // 409
          message: 'Bu isimde bir ekip zaten var',
        });
      }
    }

    // 3. Yalnızca gönderilen (undefined olmayan) alanları güncelle
    if (updateTeamDto.name !== undefined) {
      team.name = updateTeamDto.name;
    }
    if (updateTeamDto.description !== undefined) {
      team.description = updateTeamDto.description;
    }
    if (updateTeamDto.isActive !== undefined) {
      team.isActive = updateTeamDto.isActive;
    }

    // 4. Kaydet ve güncel ekibi dön (save metodu updatedAt alanını otomatik günceller)
    return await this.teamRepository.save(team);
  }

  async remove(id: number): Promise<{ deleted: boolean; id: number }> {
    // 1. Ekip var mı kontrol et (Yoksa findOne metodu 404 RpcException fırlatır)
    const team = await this.findOne(id);

    // 2. Varsa veritabanından sil
    await this.teamRepository.remove(team);

    return { deleted: true, id };
  }
}
