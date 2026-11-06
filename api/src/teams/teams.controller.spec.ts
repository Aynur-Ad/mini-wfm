import { HTTP_CODE_METADATA } from '@nestjs/common/constants';
import { Test, TestingModule } from '@nestjs/testing';
import { firstValueFrom, of } from 'rxjs';
import { vi } from 'vitest';
import { CreateTeamDto } from './dto/create-team.dto.js';
import { QueryTeamsDto } from './dto/query-teams.dto.js';
import { UpdateTeamDto } from './dto/update-team.dto.js';
import { TeamsController } from './teams.controller.js';
import { TeamsService } from './teams.service.js';

describe('TeamsController (API)', () => {
  let controller: TeamsController;
  const service = {
    create: vi.fn(),
    findAll: vi.fn(),
    findOne: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    addMember: vi.fn(),
    removeMember: vi.fn(),
  };

  beforeEach(async () => {
    vi.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TeamsController],
      providers: [{ provide: TeamsService, useValue: service }],
    }).compile();
    controller = module.get<TeamsController>(TeamsController);
  });

  it('oluşturma DTO verisini service metoduna aktarır ve yanıtı korur', async () => {
    const dto: CreateTeamDto = { name: 'Saha Ekibi', description: 'Açıklama' };
    const response = { id: 1, name: 'Saha Ekibi' };
    service.create.mockReturnValue(of(response));
    expect(await firstValueFrom(controller.create(dto))).toEqual(response);
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('liste sorgusunu service metoduna aktarır', async () => {
    const query: QueryTeamsDto = {
      page: 2,
      limit: 10,
      search: 'Saha',
      isActive: false,
    };
    const response = { data: [], total: 0, page: 2, limit: 10 };
    service.findAll.mockReturnValue(of(response));
    expect(await firstValueFrom(controller.findAll(query))).toEqual(response);
    expect(service.findAll).toHaveBeenCalledWith(query);
  });

  it('detay kimliğini service metoduna aktarır', async () => {
    const response = { id: 1, name: 'Saha Ekibi' };
    service.findOne.mockReturnValue(of(response));
    expect(await firstValueFrom(controller.findOne(1))).toEqual(response);
    expect(service.findOne).toHaveBeenCalledWith(1);
  });

  it('güncellemede URL kimliğini ve DTO verisini ayrı aktarır', async () => {
    const dto: UpdateTeamDto = { description: '', isActive: false };
    service.update.mockReturnValue(of({ id: 1 }));
    await firstValueFrom(controller.update(1, dto));
    expect(service.update).toHaveBeenCalledWith(1, dto);
  });

  it('silme kimliğini aktarır ve 204 için boş yanıt üretir', async () => {
    service.remove.mockReturnValue(of({ deleted: true, id: 1 }));
    expect(await firstValueFrom(controller.remove(1))).toBeUndefined();
    expect(service.remove).toHaveBeenCalledWith(1);
    expect(
      Reflect.getMetadata(
        HTTP_CODE_METADATA,
        Object.getOwnPropertyDescriptor(TeamsController.prototype, 'remove')
          ?.value,
      ),
    ).toBe(204);
  });

  it('atamada URL ekip kimliğini ve body personel kimliğini kullanır', async () => {
    const person = { id: 10, teamId: 1 };
    service.addMember.mockReturnValue(of(person));
    const dto = Object.assign({ workforceUserId: 10 }, { teamId: 999 });
    expect(await firstValueFrom(controller.addMember(1, dto))).toEqual(person);
    expect(service.addMember).toHaveBeenCalledWith(1, 10);
  });

  it('üyelik kaldırmada iki kimliği aktarır ve 204 için boş yanıt üretir', async () => {
    service.removeMember.mockReturnValue(of({ id: 10, teamId: null }));
    expect(
      await firstValueFrom(controller.removeMember(1, 10)),
    ).toBeUndefined();
    expect(service.removeMember).toHaveBeenCalledWith(1, 10);
    expect(
      Reflect.getMetadata(
        HTTP_CODE_METADATA,
        Object.getOwnPropertyDescriptor(
          TeamsController.prototype,
          'removeMember',
        )?.value,
      ),
    ).toBe(204);
  });
});