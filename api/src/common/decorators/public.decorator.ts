import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'mini-wfm:is-public';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);