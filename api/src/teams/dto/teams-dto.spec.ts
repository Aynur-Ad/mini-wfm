import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateTeamDto } from './create-team.dto.js';
import { QueryTeamsDto } from './query-teams.dto.js';
import { UpdateTeamDto } from './update-team.dto.js';

describe('Teams DTO Doğrulama Testleri', () => {
  describe('CreateTeamDto', () => {
    it('geçerli ad ve açıklama ile doğrulamadan başarıyla geçer', async () => {
      const dto = plainToInstance(CreateTeamDto, {
        name: 'Backend Geliştirme Ekibi',
        description: 'Mikroservis ekibi',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('ekip adı boş bırakıldığında doğrulama hatası döner', async () => {
      const dto = plainToInstance(CreateTeamDto, {
        name: '',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('name');
    });

    it('ekip adı 200 karakterden uzun olduğunda doğrulama hatası döner', async () => {
      const dto = plainToInstance(CreateTeamDto, {
        name: 'A'.repeat(201),
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('name');
    });

    it('ekip adı metin yerine sayı gönderildiğinde doğrulama hatası döner', async () => {
      const dto = plainToInstance(CreateTeamDto, {
        name: 12345,
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('name');
    });
  });

  describe('UpdateTeamDto', () => {
    it('hiçbir alan gönderilmese bile (tüm alanlar opsiyonel) doğrulamadan geçer', async () => {
      const dto = plainToInstance(UpdateTeamDto, {});

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('isActive alanı boolean (false) gönderildiğinde doğrulamadan geçer', async () => {
      const dto = plainToInstance(UpdateTeamDto, {
        isActive: false,
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('isActive alanına boolean yerine metin gönderildiğinde doğrulama hatası döner', async () => {
      const dto = plainToInstance(UpdateTeamDto, {
        isActive: 'aktif-degil',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('isActive');
    });
  });

  describe('QueryTeamsDto', () => {
    it('geçerli query parametrelerini (metinden sayıya ve booleana dönüştürerek) doğrular', async () => {
      const dto = plainToInstance(QueryTeamsDto, {
        page: '2',
        limit: '20',
        search: 'Backend',
        isActive: 'false',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
      expect(dto.page).toBe(2);
      expect(dto.limit).toBe(20);
      expect(dto.isActive).toBe(false);
    });

    it('page=0 gönderildiğinde doğrulama hatası döner', async () => {
      const dto = plainToInstance(QueryTeamsDto, {
        page: '0',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('page');
    });

    it('limit=500 (100den büyük) gönderildiğinde doğrulama hatası döner', async () => {
      const dto = plainToInstance(QueryTeamsDto, {
        limit: '500',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('limit');
    });

    it('page veya limit için sayı yerine metin gönderildiğinde doğrulama hatası döner', async () => {
      const dto = plainToInstance(QueryTeamsDto, {
        page: 'birinci-sayfa',
        limit: 'on',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(2);
    });
  });
});
