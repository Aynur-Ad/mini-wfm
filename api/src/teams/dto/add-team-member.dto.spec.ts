import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AddTeamMemberDto } from './add-team-member.dto.js';

describe('AddTeamMemberDto', () => {
  it('pozitif tam sayı ID kabul eder', async () => {
    expect(
      await validate(
        plainToInstance(AddTeamMemberDto, { workforceUserId: 10 }),
      ),
    ).toHaveLength(0);
  });

  it.each([undefined, null, 0, -1, 1.5, '10', 'abc', true, {}, []])(
    'geçersiz personel ID değerini reddeder: %s',
    async (workforceUserId) => {
      expect(
        (await validate(plainToInstance(AddTeamMemberDto, { workforceUserId })))
          .length,
      ).toBeGreaterThan(0);
    },
  );
});