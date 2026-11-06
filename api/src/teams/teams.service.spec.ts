import { Test, TestingModule } from '@nestjs/testing';
import { firstValueFrom, of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { TeamsService } from './teams.service.js';
import { CreateTeamDto } from './dto/create-team.dto.js';
import { QueryTeamsDto } from './dto/query-teams.dto.js';
import { UpdateTeamDto } from './dto/update-team.dto.js';

describe('TeamsService (API)', () => {
  let service: TeamsService;
  const client = { send: vi.fn() };

  beforeEach(async () => {
    vi.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamsService,
        { provide: 'WORKFORCE_SERVICE', useValue: client },
      ],
    }).compile();
    service = module.get<TeamsService>(TeamsService);
  });

  it('oluşturma DTO verisini createTeam mesajıyla gönderir ve yanıtı korur', async () => {
    const dto: CreateTeamDto = {
      name: 'Saha Ekibi',
      description: 'Saha işleri',
    };
    const response = { id: 1, name: 'Saha Ekibi' };
    client.send.mockReturnValue(of(response));
    expect(await firstValueFrom(service.create(dto))).toEqual(response);
    expect(client.send).toHaveBeenCalledWith('createTeam', dto);
  });

  it('liste sorgusunu findAllTeams mesajıyla gönderir', async () => {
    const query: QueryTeamsDto = {
      page: 2,
      limit: 10,
      search: 'Saha',
      isActive: false,
    };
    const response = { data: [], total: 0, page: 2, limit: 10 };
    client.send.mockReturnValue(of(response));
    expect(await firstValueFrom(service.findAll(query))).toEqual(response);
    expect(client.send).toHaveBeenCalledWith('findAllTeams', query);
  });

  it('detay kimliğini findOneTeam mesajıyla gönderir', async () => {
    const response = { id: 1, name: 'Saha Ekibi', members: [] };
    client.send.mockReturnValue(of(response));
    expect(await firstValueFrom(service.findOne(1))).toEqual(response);
    expect(client.send).toHaveBeenCalledWith('findOneTeam', 1);
  });

  it('güncellemede URL kimliğini korur; boş açıklama ve false değerini taşır', async () => {
    const dto: UpdateTeamDto = Object.assign(
      { description: '', isActive: false },
      { id: 999 },
    );
    client.send.mockReturnValue(of({ id: 1 }));
    await firstValueFrom(service.update(1, dto));
    expect(client.send).toHaveBeenCalledWith('updateTeam', {
      description: '',
      isActive: false,
      id: 1,
    });
    expect(dto).toHaveProperty('id', 999);
  });

  it('silme kimliğini removeTeam mesajıyla gönderir', async () => {
    const response = { deleted: true, id: 1 };
    client.send.mockReturnValue(of(response));
    expect(await firstValueFrom(service.remove(1))).toEqual(response);
    expect(client.send).toHaveBeenCalledWith('removeTeam', 1);
  });

  it('atamada ekip ve personel kimliklerini addTeamMember mesajıyla gönderir', async () => {
    const response = { id: 10, teamId: 1 };
    client.send.mockReturnValue(of(response));
    expect(await firstValueFrom(service.addMember(1, 10))).toEqual(response);
    expect(client.send).toHaveBeenCalledWith('addTeamMember', {
      teamId: 1,
      workforceUserId: 10,
    });
  });

  it('üyelik kaldırmada iki kimliği removeTeamMember mesajıyla gönderir', async () => {
    const response = { id: 10, teamId: null };
    client.send.mockReturnValue(of(response));
    expect(await firstValueFrom(service.removeMember(1, 10))).toEqual(response);
    expect(client.send).toHaveBeenCalledWith('removeTeamMember', {
      teamId: 1,
      workforceUserId: 10,
    });
  });

  it('microservice hatasını değiştirmeden API hata filtresine iletir', async () => {
    const error = { statusCode: 409, message: 'Üyesi olan ekip silinemez' };
    client.send.mockReturnValue(throwError(() => error));
    await expect(firstValueFrom(service.remove(1))).rejects.toBe(error);
  });
});