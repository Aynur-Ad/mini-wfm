import { HttpStatus, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateTeamDto } from './dto/create-team.dto.js';
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

  findAll() {
    return `This action returns all teams`;
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

  update(id: number, updateTeamDto: UpdateTeamDto) {
    return `This action updates a #${id} team`;
  }

  remove(id: number) {
    return `This action removes a #${id} team`;
  }
}
