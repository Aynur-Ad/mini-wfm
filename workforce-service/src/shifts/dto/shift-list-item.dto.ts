import type { Shift } from '../entities/shift.entity.js';

// Veritabanı entity'si yerine döndürülen açık liste sözleşmesi.
export type ShiftListItem = Pick<
  Shift,
  | 'id'
  | 'workforceUserId'
  | 'startAt'
  | 'endAt'
  | 'note'
  | 'createdById'
  | 'createdAt'
  | 'updatedAt'
> & {
  workforceUser: {
    id: number;
    firstName: string;
    lastName: string;
    team: { id: number; name: string } | null;
  };
};