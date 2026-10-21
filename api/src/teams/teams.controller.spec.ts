import { Test, TestingModule } from '@nestjs/testing';
import { firstValueFrom, of } from 'rxjs';
import { vi } from 'vitest';
import { CreateTeamDto } from './dto/create-team.dto.js';
import { QueryTeamsDto } from './dto/query-teams.dto.js';
import { UpdateTeamDto } from './dto/update-team.dto.js';
import { TeamsController } from './teams.controller.js';

describe('TeamsController (API)', () => {
  let controller: TeamsController;

  const mockWorkforceClient = {
    send: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TeamsController],
      providers: [
        {
          provide: 'WORKFORCE_SERVICE',
          useValue: mockWorkforceClient,
        },
      ],
    }).compile();

    controller = module.get<TeamsController>(TeamsController);
  });

  it('create endpointi createTeam mesajıyla doğru DTO verisini gönderir', () => {
    const dto: CreateTeamDto = {
      name: 'Backend Ekibi',
      description: 'Açıklama',
    };
    mockWorkforceClient.send.mockReturnValue(of({ id: 1, ...dto }));

    controller.create(dto);

    expect(mockWorkforceClient.send).toHaveBeenCalledWith('createTeam', dto);
  });

  it('findAll endpointi findAllTeams mesajıyla query parametrelerini gönderir', () => {
    const query: QueryTeamsDto = {
      page: 2,
      limit: 5,
      search: 'Backend',
      isActive: true,
    };
    mockWorkforceClient.send.mockReturnValue(
      of({ data: [], total: 0, page: 2, limit: 5 }),
    );

    controller.findAll(query);

    expect(mockWorkforceClient.send).toHaveBeenCalledWith(
      'findAllTeams',
      query,
    );
  });

  it('findOne endpointi findOneTeam mesajıyla ekip ID değerini gönderir', () => {
    mockWorkforceClient.send.mockReturnValue(
      of({ id: 1, name: 'Backend Ekibi' }),
    );

    controller.findOne(1);

    expect(mockWorkforceClient.send).toHaveBeenCalledWith('findOneTeam', 1);
  });

  it('update endpointi updateTeam mesajıyla ID ve güncel alanları birleştirerek gönderir', () => {
    const dto: UpdateTeamDto = {
      description: 'Güncel açıklama',
      isActive: false,
    };
    mockWorkforceClient.send.mockReturnValue(of({ id: 1, ...dto }));

    controller.update(1, dto);

    expect(mockWorkforceClient.send).toHaveBeenCalledWith('updateTeam', {
      id: 1,
      ...dto,
    });
  });

  it('remove endpointi removeTeam mesajıyla ekip ID değerini gönderir', async () => {
    mockWorkforceClient.send.mockReturnValue(of(null));

    const result$ = controller.remove(1);
    // Eğer remove içinde .pipe(map(...)) varsa Observable'ın tetiklenmesi veya doğrudan kontrolü:
    await firstValueFrom(result$);

    expect(mockWorkforceClient.send).toHaveBeenCalledWith('removeTeam', 1);
  });
});
