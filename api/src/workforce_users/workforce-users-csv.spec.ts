import { readWorkforceCsv } from './workforce-users-csv.js';

const header = 'firstName,lastName,registrationNumber,phone';

describe('readWorkforceCsv', () => {
  it('Excel BOM, noktalı virgül, tırnak ve baştaki sıfırları korur', () => {
    const csv = Buffer.from(
      '\uFEFF' +
        header.replaceAll(',', ';') +
        '\r\n"Can; Bora";"Yıl""maz";00001;\r\n',
    );
    expect(readWorkforceCsv(csv)).toEqual([
      {
        row: 2,
        person: {
          firstName: 'Can; Bora',
          lastName: 'Yıl"maz',
          registrationNumber: '00001',
          phone: null,
        },
      },
    ]);
  });

  it('alıntı içindeki yeni satırdan sonra fiziksel satır numarasını bildirir', () => {
    const csv = Buffer.from(
      header + '\n"Can\nBora",Kaya,1,\nAyşe,Kaya,2,123\n',
    );
    expect(() => readWorkforceCsv(csv)).toThrow(
      expect.objectContaining({
        response: expect.objectContaining({
          details: [
            { row: 4, messages: [expect.stringContaining('10 haneli')] },
          ],
        }),
      }),
    );
  });

  it.each([
    [header, 'en az bir'],
    [header + '\n"Ayşe,Kaya,1,', 'kapatılmamış'],
    [
      'firstName,lastName,firstName,registrationNumber\nCan,Kaya,Can,1',
      'başlıkları',
    ],
    [header + '\nAyşe,Kaya,1,,', 'Sütun sayısı'],
    [header + '\n' + 'Ayşe,Kaya,1,\n'.repeat(501), 'en fazla 500'],
  ])('geçersiz CSV dosyasını reddeder', (csv, message) => {
    expect(() => readWorkforceCsv(Buffer.from(csv))).toThrow(
      expect.objectContaining({
        response: expect.objectContaining(
          message === 'Sütun sayısı'
            ? {
                details: [
                  { row: 2, messages: [expect.stringContaining(message)] },
                ],
              }
            : { message: expect.stringContaining(message) },
        ),
      }),
    );
  });
});
