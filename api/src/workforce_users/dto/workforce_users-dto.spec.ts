import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateWorkforceUserDto } from './create-workforce_user.dto.js';
import { QueryWorkforceUsersDto } from './query-workforce_users.dto.js';
import { UpdateWorkforceUserDto } from './update-workforce_user.dto.js';

const valid = {
  firstName: 'Deniz',
  lastName: 'Kaya',
  registrationNumber: 'P1001',
  phone: '5321234567',
};

describe('Personel DTO doğrulaması', () => {
  describe('CreateWorkforceUserDto', () => {
    it('geçerli personel bilgilerini kabul eder', async () => {
      expect(
        await validate(plainToInstance(CreateWorkforceUserDto, valid)),
      ).toEqual([]);
    });

    it.each(['firstName', 'lastName', 'registrationNumber'])(
      '%s gönderilmezse hata verir',
      async (field) => {
        const raw: Record<string, unknown> = { ...valid };
        delete raw[field];
        expect(
          await validate(plainToInstance(CreateWorkforceUserDto, raw)),
        ).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ property: field }),
          ]),
        );
      },
    );

    it.each([
      ['firstName', ''],
      ['firstName', '   '],
      ['firstName', null],
      ['firstName', 123],
      ['firstName', 'A'.repeat(101)],
      ['lastName', ''],
      ['lastName', '   '],
      ['lastName', null],
      ['lastName', 123],
      ['lastName', 'A'.repeat(101)],
      ['registrationNumber', ''],
      ['registrationNumber', '   '],
      ['registrationNumber', null],
      ['registrationNumber', 123],
      ['registrationNumber', 'A'.repeat(21)],
    ])('%s alanında geçersiz %j değerini reddeder', async (field, value) => {
      const dto = plainToInstance(CreateWorkforceUserDto, {
        ...valid,
        [field as string]: value,
      });
      expect(await validate(dto)).toEqual(
        expect.arrayContaining([expect.objectContaining({ property: field })]),
      );
    });

    it('alanların izin verilen en büyük uzunluklarını kabul eder', async () => {
      const dto = plainToInstance(CreateWorkforceUserDto, {
        firstName: 'A'.repeat(100),
        lastName: 'B'.repeat(100),
        registrationNumber: '1'.repeat(20),
      });
      expect(await validate(dto)).toEqual([]);
    });

    it('ad, soyad ve sicilin çevresindeki boşlukları temizler', async () => {
      const dto = plainToInstance(CreateWorkforceUserDto, {
        firstName: ' Deniz ',
        lastName: ' Kaya ',
        registrationNumber: ' P1001 ',
      });
      expect(await validate(dto)).toEqual([]);
      expect(dto.firstName).toBe('Deniz');
      expect(dto.lastName).toBe('Kaya');
      expect(dto.registrationNumber).toBe('P1001');
    });

    it.each([undefined, null])(
      'telefon %j olduğunda kabul eder',
      async (phone) => {
        expect(
          await validate(
            plainToInstance(CreateWorkforceUserDto, { ...valid, phone }),
          ),
        ).toEqual([]);
      },
    );

    it.each([
      '',
      '4321234567',
      '532123456',
      '05321234567',
      '532 1234567',
      '532abcdefg',
      5321234567,
    ])('hatalı telefonu reddeder: %j', async (phone) => {
      expect(
        await validate(
          plainToInstance(CreateWorkforceUserDto, { ...valid, phone }),
        ),
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ property: 'phone' }),
        ]),
      );
    });

    it('uygulamadaki ValidationPipe bilinmeyen alanları atar', async () => {
      const pipe = new ValidationPipe({ whitelist: true, transform: true });
      const dto: CreateWorkforceUserDto = await pipe.transform(
        { ...valid, id: 999, isActive: false, extra: 'yabancı' },
        { type: 'body', metatype: CreateWorkforceUserDto },
      );
      expect(dto).not.toHaveProperty('id');
      expect(dto).not.toHaveProperty('isActive');
      expect(dto).not.toHaveProperty('extra');
      expect(dto.registrationNumber).toBe('P1001');
    });

    it('uygulamadaki ValidationPipe hatalı telefonu 400 olarak reddeder', async () => {
      const pipe = new ValidationPipe({ whitelist: true, transform: true });
      await expect(
        pipe.transform(
          { ...valid, phone: '123' },
          { type: 'body', metatype: CreateWorkforceUserDto },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('UpdateWorkforceUserDto', () => {
    it('boş güncellemeyi kabul eder; alanlar opsiyoneldir', async () => {
      expect(
        await validate(plainToInstance(UpdateWorkforceUserDto, {})),
      ).toEqual([]);
    });

    it('tek alan güncellemesini kabul eder', async () => {
      expect(
        await validate(
          plainToInstance(UpdateWorkforceUserDto, { lastName: 'Yeni' }),
        ),
      ).toEqual([]);
    });

    it.each([true, false])(
      'boolean aktiflik değerini kabul eder: %j',
      async (isActive) => {
        expect(
          await validate(plainToInstance(UpdateWorkforceUserDto, { isActive })),
        ).toEqual([]);
      },
    );

    it.each(['false', 'true', 0, 1, null])(
      'geçersiz aktifliği reddeder: %j',
      async (isActive) => {
        expect(
          await validate(plainToInstance(UpdateWorkforceUserDto, { isActive })),
        ).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ property: 'isActive' }),
          ]),
        );
      },
    );

    it.each(['firstName', 'lastName', 'registrationNumber'])(
      'gönderilmeyen %s alanına izin verir ama null ile boşaltılmasını reddeder',
      async (field) => {
        expect(
          await validate(
            plainToInstance(UpdateWorkforceUserDto, { [field]: null }),
          ),
        ).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ property: field }),
          ]),
        );
      },
    );

    it('oluşturmadaki uzunluk ve telefon kurallarını korur', async () => {
      const errors = await validate(
        plainToInstance(UpdateWorkforceUserDto, {
          firstName: 'A'.repeat(101),
          registrationNumber: '',
          phone: '123',
        }),
      );
      expect(errors.map((error) => error.property).sort()).toEqual([
        'firstName',
        'phone',
        'registrationNumber',
      ]);
    });

    it('telefonun null ile boşaltılmasına izin verir', async () => {
      expect(
        await validate(
          plainToInstance(UpdateWorkforceUserDto, { phone: null }),
        ),
      ).toEqual([]);
    });

    it('body kimliğini atar, false aktifliği korur', async () => {
      const pipe = new ValidationPipe({ whitelist: true, transform: true });
      const dto: UpdateWorkforceUserDto = await pipe.transform(
        { id: 999, isActive: false },
        { type: 'body', metatype: UpdateWorkforceUserDto },
      );
      expect(dto).not.toHaveProperty('id');
      expect(dto.isActive).toBe(false);
    });
  });

  describe('QueryWorkforceUsersDto', () => {
    it('varsayılan sayfa ve limiti uygular', async () => {
      const dto = plainToInstance(QueryWorkforceUsersDto, {});
      expect(await validate(dto)).toEqual([]);
      expect(dto.page).toBe(1);
      expect(dto.limit).toBe(10);
    });

    it.each(['true', 'false'])(
      'query içindeki %s metnini doğru boolean’a çevirir',
      async (value) => {
        const dto = plainToInstance(QueryWorkforceUsersDto, {
          page: '2',
          limit: '20',
          isActive: value,
          search: 'Kaya',
        });
        expect(await validate(dto)).toEqual([]);
        expect(dto.page).toBe(2);
        expect(dto.limit).toBe(20);
        expect(dto.isActive).toBe(value === 'true');
      },
    );

    it('izin verilen üst limit olan 100’ü kabul eder', async () => {
      expect(
        await validate(
          plainToInstance(QueryWorkforceUsersDto, { limit: '100' }),
        ),
      ).toEqual([]);
    });

    it.each([
      ['page', '0'],
      ['page', '-1'],
      ['page', '1.5'],
      ['page', 'abc'],
      ['limit', '0'],
      ['limit', '101'],
      ['limit', '500'],
      ['limit', '1.5'],
      ['limit', 'abc'],
      ['isActive', 'yes'],
      ['isActive', '1'],
      ['isActive', 0],
      ['isActive', ['true']],
      ['search', 123],
      ['search', ['Deniz']],
    ])('%s için geçersiz %j değerini reddeder', async (field, value) => {
      expect(
        await validate(
          plainToInstance(QueryWorkforceUsersDto, { [field as string]: value }),
        ),
      ).toEqual(
        expect.arrayContaining([expect.objectContaining({ property: field })]),
      );
    });
  });
});