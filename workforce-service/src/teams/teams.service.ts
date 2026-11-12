import { WorkOrderStatusHistory } from '../work-orders/entities/work-order-status-history.entity.js';
import { WorkOrder } from '../work-orders/entities/work-order.entity.js';
import { WorkOrderStatus } from '../work-orders/work-order.enums.js';
import { HttpStatus, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, In, Not, Repository } from 'typeorm';
import { CreateTeamDto } from './dto/create-team.dto.js';
import { QueryTeamsDto } from './dto/query-teams.dto.js';
import { UpdateTeamDto } from './dto/update-team.dto.js';
import { Team } from './entities/team.entity.js';
import { WorkforceUser } from '../workforce_users/entities/workforce_user.entity.js';

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
      relations: { members: true },
      order: { members: { id: 'ASC' } },
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
    // Güncellemede üyeleri yükleyip save'e taşımayız; üyelik yalnızca kendi
    // endpoint'leri üzerinden değiştirilir.
    const team = await this.teamRepository.findOne({ where: { id } });
    if (!team) {
      throw new RpcException({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Ekip bulunamadı',
      });
    }

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
    return this.teamRepository.manager.transaction(async (manager) => {
      const teams = manager.getRepository(Team);
      const people = manager.getRepository(WorkforceUser);
      // Atama da önce aynı ekip satırını kilitler; kontrol ve silme arasına
      // yeni üyelik giremez. Foreign key ayrıca veritabanında silmeyi sınırlar.
      const team = await teams.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!team) {
        throw new RpcException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Ekip bulunamadı',
        });
      }
      if (await people.existsBy({ teamId: id })) {
        throw new RpcException({
          statusCode: HttpStatus.CONFLICT,
          message:
            'Üyesi olan ekip silinemez. Önce personelleri ekipten çıkarın.',
        });
      }
      const orders = manager.getRepository(WorkOrder);
      if (
        await orders.existsBy({
          teamId: id,
          status: Not(
            In([WorkOrderStatus.COMPLETED, WorkOrderStatus.CANCELLED]),
          ),
        })
      ) {
        throw new RpcException({
          statusCode: 409,
          message: 'Açık iş emri olan ekip silinemez',
        });
      }
      // B12: kapanmış iş emri de ekibe bağlı bir geçmiş kaydıdır; RESTRICT korunur.
      if (await orders.existsBy({ teamId: id })) {
        throw new RpcException({
          statusCode: 409,
          message: 'İş emri geçmişi olan ekip silinemez',
        });
      }
      if (
        await manager
          .getRepository(WorkOrderStatusHistory)
          .existsBy({ teamId: id })
      ) {
        throw new RpcException({
          statusCode: 409,
          message: 'İş emri durum geçmişi olan ekip silinemez',
        });
      }
      await teams.remove(team);
      return { deleted: true, id };
    });
  }

  async addMember(
    teamId: number,
    workforceUserId: number,
  ): Promise<WorkforceUser> {
    return this.changeMembership(teamId, workforceUserId, true);
  }

  async removeMember(
    teamId: number,
    workforceUserId: number,
  ): Promise<WorkforceUser> {
    return this.changeMembership(teamId, workforceUserId, false);
  }

  private async changeMembership(
    teamId: number,
    workforceUserId: number,
    assigning: boolean,
  ): Promise<WorkforceUser> {
    return this.teamRepository.manager.transaction(async (manager) => {
      const teams = manager.getRepository(Team);
      const people = manager.getRepository(WorkforceUser);
      // Sıra tüm üyelik işlemlerinde aynıdır: önce ekip, sonra personel.
      const team = await teams.findOne({
        where: { id: teamId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!team) {
        throw new RpcException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Ekip bulunamadı',
        });
      }
      const person = await people.findOne({
        where: { id: workforceUserId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!person) {
        throw new RpcException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Personel bulunamadı.',
        });
      }
      if (!team.isActive || !person.isActive) {
        throw new RpcException({
          statusCode: HttpStatus.CONFLICT,
          message: 'Ekip ve personel aktif olmalıdır.',
        });
      }
      if (assigning && person.teamId !== null) {
        const currentTeam =
          person.teamId === team.id
            ? team
            : await teams.findOne({
                where: { id: person.teamId },
                select: { id: true, name: true },
              });
        throw new RpcException({
          statusCode: HttpStatus.CONFLICT,
          message: `Personel zaten ${currentTeam?.name ?? `#${person.teamId}`} ekibine atanmış (ekip ID: ${person.teamId}).`,
        });
      }
      if (!assigning && person.teamId !== team.id) {
        throw new RpcException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Personel bu ekibin üyesi değil.',
        });
      }
      person.teamId = assigning ? team.id : null;
      const saved = await people.save(person);
      // Tüm ekibi ve üyelerini geri bağlamak döngüsel JSON oluştururdu.
      saved.team = assigning
        ? Object.assign(new Team(), { id: team.id, name: team.name })
        : null;
      return saved;
    });
  }
}