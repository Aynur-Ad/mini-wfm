import { once } from 'node:events';
import { createServer } from 'node:net';
import { describe, expect, it } from 'vitest';
import { readMailSettings } from './mail-settings.js';
import { MailService } from './mail.service.js';

const localSettings = {
  SMTP_HOST: '127.0.0.1',
  SMTP_TLS_MODE: 'plain',
  SMTP_FROM: 'mini-wfm@example.test',
};
const mail = {
  to: 'tester@example.test',
  subject: 'Mini WFM',
  text: 'Local SMTP test',
};

describe('E-posta ayarları', () => {
  it('SMTP_HOST boşken gönderimi kapalı tutar', async () => {
    const settings = readMailSettings({});
    expect(settings).toBeNull();
    await expect(new MailService(settings).send(mail)).rejects.toThrow(
      'yapılandırılmamış',
    );
  });

  it('harici SMTP için STARTTLS varsayımını kullanır', () => {
    expect(
      readMailSettings({
        SMTP_HOST: 'smtp.example.test',
        SMTP_FROM: localSettings.SMTP_FROM,
      }),
    ).toMatchObject({ port: 587, tlsMode: 'starttls' });
  });

  it.each([
    { SMTP_HOST: 'smtp.example.test' },
    { SMTP_USER: 'test', SMTP_PASSWORD: 'example-secret' },
    { SMTP_PORT: '0' },
    { SMTP_FROM: 'first@example.test,second@example.test' },
  ])('geçersiz yapılandırma değerlerini hata mesajına yazmaz', (extra) => {
    expect(() => readMailSettings({ ...localSettings, ...extra })).toThrow(
      /^Geçersiz e-posta ayarları: (?!.*example-secret)/,
    );
  });

  it('birden fazla alıcı içeren girdiyi bağlantı açmadan reddeder', async () => {
    const service = new MailService(readMailSettings(localSettings));
    await expect(
      service.send({
        ...mail,
        to: 'first@example.test,second@example.test',
      }),
    ).rejects.toThrow('Alıcı adresi');
  });
});

describe('SMTP gönderimi', () => {
  it.each([true, false])(
    'yerel SMTP sunucusu alıcıyı kabul ediyor: %s',
    async (acceptRecipient) => {
      const received: string[] = [];
      const server = createServer((socket) => {
        socket.write('220 localhost test SMTP\r\n');
        socket.setEncoding('utf8');
        let pending = '';
        let readingMail = false;
        socket.on('data', (chunk: string) => {
          pending += chunk;
          const lines = pending.split('\r\n');
          pending = lines.pop() ?? '';
          for (const line of lines) {
            if (readingMail && line === '.') {
              readingMail = false;
              socket.write('250 accepted\r\n');
            } else if (readingMail) {
              received.push(line);
            } else if (line.startsWith('EHLO')) {
              socket.write('250 localhost\r\n');
            } else if (line.startsWith('MAIL FROM:')) {
              received.push(line);
              socket.write('250 sender accepted\r\n');
            } else if (line.startsWith('RCPT TO:')) {
              received.push(line);
              socket.write(
                acceptRecipient
                  ? '250 recipient accepted\r\n'
                  : '550 tester@example.test rejected\r\n',
              );
            } else if (line === 'DATA') {
              readingMail = true;
              socket.write('354 send message\r\n');
            } else if (line === 'QUIT') {
              socket.end('221 closing\r\n');
            }
          }
        });
      });
      server.listen(0, '127.0.0.1');
      await once(server, 'listening');
      try {
        const address = server.address();
        if (!address || typeof address === 'string')
          throw new Error('SMTP test portu açılamadı.');
        const service = new MailService(
          readMailSettings({ ...localSettings, SMTP_PORT: address.port }),
        );
        if (acceptRecipient) {
          await expect(service.send(mail)).resolves.toBeUndefined();
          expect(received).toEqual(
            expect.arrayContaining([
              'MAIL FROM:<mini-wfm@example.test>',
              'RCPT TO:<tester@example.test>',
              'Subject: Mini WFM',
              'Local SMTP test',
            ]),
          );
        } else {
          await expect(service.send(mail)).rejects.toThrow(
            /^SMTP sunucusu e-postayı kabul etmedi\.[^@]+$/,
          );
        }
      } finally {
        await new Promise<void>((resolve, reject) =>
          server.close((error) => (error ? reject(error) : resolve())),
        );
      }
    },
  );
});
