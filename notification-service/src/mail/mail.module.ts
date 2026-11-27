import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Environment } from '../config/environment.js';
import { MailService } from './mail.service.js';

@Module({
  providers: [
    {
      provide: MailService,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Environment, true>) =>
        new MailService(config.get('MAIL', { infer: true })),
    },
  ],
  exports: [MailService],
})
export class MailModule {}
