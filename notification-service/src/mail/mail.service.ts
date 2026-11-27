import { createTransport } from 'nodemailer';
import type { MailSettings } from './mail-settings.js';
import { isMailAddress } from './mail-settings.js';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

export class MailService {
  private readonly transport;

  constructor(private readonly settings: MailSettings | null) {
    this.transport =
      settings &&
      createTransport({
        host: settings.host,
        port: settings.port,
        secure: settings.tlsMode === 'tls',
        requireTLS: settings.tlsMode === 'starttls',
        ignoreTLS: settings.tlsMode === 'plain',
        auth: settings.auth,
        connectionTimeout: 5_000,
        greetingTimeout: 5_000,
        socketTimeout: 10_000,
        disableFileAccess: true,
        disableUrlAccess: true,
      });
  }

  async send({ to, subject, text }: MailMessage): Promise<void> {
    if (!this.transport || !this.settings)
      throw new Error(
        'E-posta gönderimi yapılandırılmamış. SMTP_HOST ayarını kontrol edin.',
      );
    if (
      !isMailAddress(to) ||
      !subject.trim() ||
      /[\r\n]/.test(subject) ||
      !text.trim()
    )
      throw new Error('Alıcı adresi, konu veya ileti metni geçersiz.');

    try {
      const result = await this.transport.sendMail({
        from: this.settings.from,
        to,
        subject,
        text,
        signal: AbortSignal.timeout(15_000),
      });
      if (result.accepted.length !== 1)
        throw new Error('Alıcı kabul edilmedi.');
    } catch {
      // Sağlayıcı hatası, adresleri veya kimlik doğrulama ayrıntılarını içerebilir.
      throw new Error(
        'SMTP sunucusu e-postayı kabul etmedi. Bağlantı ve gönderen ayarlarını kontrol edin.',
      );
    }
  }
}
