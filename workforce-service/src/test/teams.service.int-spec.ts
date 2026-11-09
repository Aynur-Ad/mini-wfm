import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Repository } from 'typeorm';
import { Team } from '../teams/entities/team.entity.js';
import { TeamsService } from '../teams/teams.service.js';
import { WorkforceUser } from '../workforce_users/entities/workforce_user.entity.js';
import { startPostgresTestDatabase } from './postgres-test.helper.js';
import type { PostgresTestDatabase } from './postgres-test.helper.js';

describe('TeamsService — gerçek PostgreSQL', () => {
  let database: PostgresTestDatabase | undefined;
  let module: TestingModule | undefined;
  let service: TeamsService;
  let teams: Repository<Team>;
  let people: Repository<WorkforceUser>;

  beforeAll(async () => {
    database = await startPostgresTestDatabase();
    teams = database.dataSource.getRepository(Team);
    people = database.dataSource.getRepository(WorkforceUser);
    module = await Test.createTestingModule({
      providers: [TeamsService, { provide: getRepositoryToken(Team), useValue: teams }],
    }).compile();
    service = module.get(TeamsService);
  });

  beforeEach(async () => {
    // Önceki testin verisine veya çalıştırma sırasına bağımlılık yoktur.
    expect(await teams.count()).toBe(0);
    expect(await people.count()).toBe(0);
  });

  afterEach(async () => {
    await database?.clean();
  });

  afterAll(async () => {
    try {
      await module?.close();
    } finally {
      await database?.stop();
    }
  });

  it('aynı isimde ikinci ekip oluşturulmasını 409 ile reddeder', async () => {
    await service.create({ name: 'Backend Ekibi' });
    await expect(service.create({ name: 'Backend Ekibi' })).rejects.toMatchObject({
      error: { statusCode: 409, message: 'Bu isimde bir ekip zaten var' },
    });
    expect(await teams.count()).toBe(1);
  });

  it('service atlandığında da unique kısıtı PostgreSQL tarafından uygulanır', async () => {
    await teams.insert({ name: 'Tekil Ekip' });
    await expect(teams.insert({ name: 'Tekil Ekip' })).rejects.toMatchObject({
      driverError: { code: '23505' },
    });
    expect(await teams.count()).toBe(1);
  });

  it('arama büyük/küçük harf duyarsızdır; total aramaya uyan tüm kayıtları sayar', async () => {
    await teams.insert([
      { name: 'BACKEND Alpha', createdAt: new Date('2026-01-01T08:00:00Z') },
      { name: 'backend Beta', createdAt: new Date('2026-01-02T08:00:00Z') },
      { name: 'Frontend', createdAt: new Date('2026-01-03T08:00:00Z') },
    ]);
    const result = await service.findAll({ search: 'bAcKeNd', page: 2, limit: 1 });
    expect(result).toMatchObject({ total: 2, page: 2, limit: 1 });
    expect(result.data.map((team) => team.name)).toEqual(['BACKEND Alpha']);
  });

  it('sayfalar doğru kayıtları getirir; total sayfa boyutundan bağımsızdır', async () => {
    await teams.insert(Array.from({ length: 5 }, (_, index) => ({
      name: `Ekip ${index + 1}`,
      createdAt: new Date(Date.UTC(2026, 0, index + 1)),
    })));
    const first = await service.findAll({ page: 1, limit: 2 });
    const second = await service.findAll({ page: 2, limit: 2 });
    const third = await service.findAll({ page: 3, limit: 2 });
    expect([first.total, second.total, third.total]).toEqual([5, 5, 5]);
    expect(first.data.map((team) => team.name)).toEqual(['Ekip 5', 'Ekip 4']);
    expect(second.data.map((team) => team.name)).toEqual(['Ekip 3', 'Ekip 2']);
    expect(third.data.map((team) => team.name)).toEqual(['Ekip 1']);
  });

  it('arama ve aktiflik filtresini birlikte uygular', async () => {
    await teams.insert([
      { name: 'Backend Aktif', isActive: true },
      { name: 'Backend Pasif', isActive: false },
      { name: 'Frontend Aktif', isActive: true },
    ]);
    const result = await service.findAll({ search: 'backend', isActive: true });
    expect(result.total).toBe(1);
    expect(result.data.map((team) => team.name)).toEqual(['Backend Aktif']);
  });

  it.each([true, false])('üyesi olan ekip silinemez; üyenin aktifliği: %s', async (isActive) => {
    const team = await service.create({ name: 'Saha Ekibi' });
    const person = await people.save(people.create({
      firstName: 'Deniz', lastName: 'Kaya', registrationNumber: 'P1001', isActive: true,
    }));
    await service.addMember(team.id, person.id);
    await people.update(person.id, { isActive });
    await expect(service.remove(team.id)).rejects.toMatchObject({ error: { statusCode: 409 } });
    expect(await teams.existsBy({ id: team.id })).toBe(true);
    expect(await people.findOneByOrFail({ id: person.id })).toMatchObject({ teamId: team.id });
  });

  it('üyelik varken doğrudan veritabanından ekip silinmesi de foreign key ile engellenir', async () => {
    const team = await service.create({ name: 'Korunan Ekip' });
    await people.insert({ firstName: 'Deniz', lastName: 'Kaya', registrationNumber: 'P1001', teamId: team.id });
    await expect(teams.delete(team.id)).rejects.toMatchObject({ driverError: { code: '23503' } });
    expect(await teams.count()).toBe(1);
  });

  it('üye çıkarıldıktan sonra ekip silinebilir; personel kaydı korunur', async () => {
    const team = await service.create({ name: 'Saha Ekibi' });
    const person = await people.save(people.create({ firstName: 'Deniz', lastName: 'Kaya', registrationNumber: 'P1001' }));
    await service.addMember(team.id, person.id);
    await service.removeMember(team.id, person.id);
    await expect(service.remove(team.id)).resolves.toMatchObject({ deleted: true });
    expect(await teams.count()).toBe(0);
    expect(await people.findOneByOrFail({ id: person.id })).toMatchObject({ teamId: null });
  });
});