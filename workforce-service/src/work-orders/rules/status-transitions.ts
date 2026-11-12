import { WorkOrderStatus as S } from '../work-order.enums.js';
export interface TransitionRule {
  teamAction: 'assign' | 'clear' | 'keep';
  reasonRequired?: boolean;
}
export const STATUS_TRANSITIONS: Record<
  S,
  Partial<Record<S, TransitionRule>>
> = {
  [S.OPEN]: {
    [S.ASSIGNED]: { teamAction: 'assign' },
    [S.CANCELLED]: { teamAction: 'keep', reasonRequired: true },
  },
  [S.ASSIGNED]: {
    [S.IN_PROGRESS]: { teamAction: 'keep' },
    [S.OPEN]: { teamAction: 'clear' },
    [S.CANCELLED]: { teamAction: 'keep', reasonRequired: true },
  },
  [S.IN_PROGRESS]: {
    [S.COMPLETED]: { teamAction: 'keep' },
    [S.CANCELLED]: { teamAction: 'keep', reasonRequired: true },
  },
  [S.COMPLETED]: {},
  [S.CANCELLED]: {},
};
export const STATUS_LABELS: Record<S, string> = {
  [S.OPEN]: 'Açık',
  [S.ASSIGNED]: 'Atandı',
  [S.IN_PROGRESS]: 'Devam Ediyor',
  [S.COMPLETED]: 'Tamamlandı',
  [S.CANCELLED]: 'İptal Edildi',
};