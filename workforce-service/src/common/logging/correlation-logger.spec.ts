import { describe, expect, it } from 'vitest';
import { CorrelationLogger } from './correlation-logger.js';
import { requestContext } from './request-context.js';

class TestLogger extends CorrelationLogger {
  render(message: unknown): string {
    return this.formatMessage('log', message, '', 'LOG', '', '');
  }
}

describe('CorrelationLogger', () => {
  it('istek sırasında yazılan loga aynı kimliği ekler', () => {
    const result = requestContext.run({ correlationId: 'logger-23' }, () =>
      new TestLogger().render('operation'),
    );
    expect(result).toContain('[correlationId=logger-23] operation');
  });
  it('başlangıç loglarını system ile işaretler', () => {
    expect(new TestLogger().render('starting')).toContain(
      '[correlationId=system] starting',
    );
  });
  it('ham Error nesnesindeki hassas mesajı yazdırmaz', () => {
    const result = new TestLogger().render(
      new Error('password=secret phone=5321234567'),
    );
    expect(result).not.toMatch(/secret|5321234567/);
    expect(result).toContain('Error');
  });
});