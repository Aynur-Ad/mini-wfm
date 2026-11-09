import { ConsoleLogger } from '@nestjs/common';
import type { LogLevel } from '@nestjs/common';
import { requestContext } from './request-context.js';

export class CorrelationLogger extends ConsoleLogger {
  protected override formatMessage(
    logLevel: LogLevel,
    message: unknown,
    pidMessage: string,
    formattedLogLevel: string,
    contextMessage: string,
    timestampDiff: string,
    params?: Record<string, unknown>,
  ): string {
    // Başlangıç logları herhangi bir isteğe ait değildir.
    const id = requestContext.getStore()?.correlationId ?? 'system';
    const text = message instanceof Error ? message.name : message;
    return super.formatMessage(
      logLevel,
      `[correlationId=${id}] ${typeof text === 'string' ? text : '[structured message omitted]'}`,
      pidMessage,
      formattedLogLevel,
      contextMessage,
      timestampDiff,
      params,
    );
  }

  protected override printStackTrace(): void {
    // Stack içindeki ham hata/veri yerine correlation id ile güvenli olay logları izlenir.
  }
}