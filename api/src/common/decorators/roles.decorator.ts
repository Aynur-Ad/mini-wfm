import { SetMetadata } from '@nestjs/common';
import type { AccountRole } from '../../accounts/account-role.js';

export const ROLES_KEY = 'mini-wfm:roles';

// Metot üzerindeki liste controller listesinin yerini alır.
export const Roles = (...roles: AccountRole[]) => SetMetadata(ROLES_KEY, roles);