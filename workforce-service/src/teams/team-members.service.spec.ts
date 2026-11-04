import { RpcException } from '@nestjs/microservices';
import type { Repository } from 'typeorm';
import { vi } from 'vitest';
import { Team } from './entities/team.entity.js';
import { WorkforceUser } from '../workforce_users/entities/workforce_user.entity.js';
import { TeamsService } from './teams.service.js';

describe('Ekip üyeliği iş kuralları', () => {
  const teams = {
    findOne: vi.fn(),
    remove: vi.fn(),
    manager: { transaction: vi.fn() },
  };
  const people = { findOne: vi.fn(), save: vi.fn(), existsBy: vi.fn() };
  let service: TeamsService;
  let team: Team;
  let person: WorkforceUser;

  const failure = (statusCode: number) => ({ error: { statusCode } });

  beforeEach(() => {
    vi.resetAllMocks();
    team = Object.assign(new Team(), {
      id: 1,
      name: 'Backend Ekibi',
      isActive: true,
      members: [],
    });
    person = Object.assign(new WorkforceUser(), {
      id: 10,
      firstName: 'Deniz',
      lastName: 'Kaya',
      registrationNumber: 'P1001',
      isActive: true,
      teamId: null,
    });
    teams.findOne.mockResolvedValue(team);
    people.findOne.mockResolvedValue(person);
    people.save.mockImplementation(async (value: WorkforceUser) => value);
    people.existsBy.mockResolvedValue(false);
    teams.manager.transaction.mockImplementation(
      async (work: (manager: unknown) => unknown) =>
        work({
          getRepository: (entity: unknown) =>
            entity === Team ? teams : people,
        }),
    );
    service = new TeamsService(teams as unknown as Repository<Team>);
  });

  it('aktif ve atanmamış personeli ekibe atar; cevapta yalnızca ekip ID/adı bulunur', async () => {
    const result = await service.addMember(1, 10);
    expect(result.teamId).toBe(1);
    expect(result.team).toEqual({ id: 1, name: 'Backend Ekibi' });
    expect(people.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 10, teamId: 1 }),
    );
    expect(teams.manager.transaction).toHaveBeenCalledOnce();
    expect(teams.findOne).toHaveBeenCalledWith({
      where: { id: 1 },
      lock: { mode: 'pessimistic_write' },
    });
    expect(people.findOne).toHaveBeenCalledWith({
      where: { id: 10 },
      lock: { mode: 'pessimistic_write' },
    });
  });

  it.each(['addMember', 'removeMember'] as const)(
    '%s: ekip yoksa 404 verir ve personeli değiştirmez',
    async (method) => {
      teams.findOne.mockResolvedValue(null);
      await expect(service[method](999, 10)).rejects.toMatchObject(
        failure(404),
      );
      expect(people.findOne).not.toHaveBeenCalled();
      expect(people.save).not.toHaveBeenCalled();
    },
  );

  it.each(['addMember', 'removeMember'] as const)(
    '%s: personel yoksa 404 verir',
    async (method) => {
      people.findOne.mockResolvedValue(null);
      await expect(service[method](1, 999)).rejects.toMatchObject(failure(404));
      expect(people.save).not.toHaveBeenCalled();
    },
  );

  it.each(['addMember', 'removeMember'] as const)(
    '%s: pasif ekiple işlem yapılamaz (409)',
    async (method) => {
      team.isActive = false;
      person.teamId = method === 'removeMember' ? 1 : null;
      await expect(service[method](1, 10)).rejects.toMatchObject(failure(409));
      expect(people.save).not.toHaveBeenCalled();
    },
  );

  it.each(['addMember', 'removeMember'] as const)(
    '%s: pasif personelle işlem yapılamaz (409)',
    async (method) => {
      person.isActive = false;
      person.teamId = method === 'removeMember' ? 1 : null;
      await expect(service[method](1, 10)).rejects.toMatchObject(failure(409));
      expect(people.save).not.toHaveBeenCalled();
    },
  );

  it('aynı ekibe ikinci atamayı 409 ile reddeder ve ekip adını belirtir', async () => {
    person.teamId = 1;
    await expect(service.addMember(1, 10)).rejects.toMatchObject({
      error: {
        statusCode: 409,
        message: expect.stringContaining('Backend Ekibi'),
      },
    });
    expect(people.save).not.toHaveBeenCalled();
  });

  it('başka ekibe atanmış personelde 409 ile mevcut ekibin adını/ID değerini belirtir', async () => {
    person.teamId = 2;
    teams.findOne
      .mockResolvedValueOnce(team)
      .mockResolvedValueOnce({ id: 2, name: 'Saha Ekibi' });
    const result = service.addMember(1, 10);
    await expect(result).rejects.toBeInstanceOf(RpcException);
    await expect(result).rejects.toMatchObject({
      error: {
        statusCode: 409,
        message: expect.stringContaining('Saha Ekibi'),
      },
    });
    await expect(result).rejects.toMatchObject({
      error: { message: expect.stringContaining('2') },
    });
    expect(person.teamId).toBe(2);
    expect(people.save).not.toHaveBeenCalled();
  });

  it('personeli silmeden mevcut ekip üyeliğini kaldırır', async () => {
    person.teamId = 1;
    const result = await service.removeMember(1, 10);
    expect(result.id).toBe(10);
    expect(result.teamId).toBeNull();
    expect(result.team).toBeNull();
    expect(people.save).toHaveBeenCalledOnce();
    expect(teams.remove).not.toHaveBeenCalled();
  });

  it.each([null, 2])(
    'çıkarılmak istenen personel bu ekipte değilse 404 verir (mevcut teamId=%s)',
    async (teamId) => {
      person.teamId = teamId;
      await expect(service.removeMember(1, 10)).rejects.toMatchObject(
        failure(404),
      );
      expect(people.save).not.toHaveBeenCalled();
    },
  );

  it('üyeliği kaldırılan personel sonradan yeniden atanabilir', async () => {
    person.teamId = 1;
    await service.removeMember(1, 10);
    await service.addMember(1, 10);
    expect(person.teamId).toBe(1);
    expect(people.save).toHaveBeenCalledTimes(2);
  });

  it('aktiflik filtresi uygulamadan üyeliği kontrol eder ve dolu ekibi sildirmez', async () => {
    // existsBy yalnızca teamId ile sorgulanır; pasif üyeler de üyedir.
    people.existsBy.mockResolvedValue(true);
    await expect(service.remove(1)).rejects.toMatchObject(failure(409));
    expect(people.existsBy).toHaveBeenCalledWith({ teamId: 1 });
    expect(teams.remove).not.toHaveBeenCalled();
  });

  it('üyesiz ekip silinir', async () => {
    expect(await service.remove(1)).toEqual({ deleted: true, id: 1 });
    expect(teams.remove).toHaveBeenCalledWith(team);
  });

  it('kayıt hatasını başarıya dönüştürmez; hata transaction dışına taşar', async () => {
    const error = new Error('write failed');
    people.save.mockRejectedValue(error);
    await expect(service.addMember(1, 10)).rejects.toBe(error);
  });
});