# Mini WFM

Mini WFM, saha ekipleri, personel, vardiyalar ve iş emirleri için bir iş gücü yönetimi uygulamasıdır.

## Mimari

| Bileşen | Görevi |
| --- | --- |
| `web` | React, TypeScript, Vite ve Ant Design arayüzü; API'ye HTTP ile bağlanır. |
| `api` | NestJS HTTP API; doğrulama, JWT, rol kontrolü ve Swagger. Servislere TCP ile bağlanır, veritabanına erişmez. |
| `workforce-service` | İş kurallarını uygular; TypeORM ile PostgreSQL'in `workforce` şemasına erişir. İş emri olaylarını RabbitMQ'ya yayınlar. |
| `notification-service` | RabbitMQ olaylarından bildirim oluşturur; `notification` şemasına yazar ve API'ye TCP üzerinden okuma sağlar. HTTP portu açmaz. |
| PostgreSQL | Uygulama verilerini saklar. |
| RabbitMQ | İş emri olaylarını kalıcı kuyruk üzerinden bildirim servisine iletir. |

## Gereksinimler

- Node.js 24.x
- pnpm 11 veya üzeri; yerel kurulum pnpm 12.10.1 ile doğrulanmıştır.
- Git
- Docker Desktop ve Docker Compose; Docker Desktop Linux container modunda açık olmalıdır.
- Web arayüzü ve Swagger için tarayıcı

Nest CLI uygulamaların bağımlılıklarında bulunur; global kurulum gerekmez. Aşağıdaki komutlar **Windows PowerShell** içindir ve aksi belirtilmedikçe **proje kökünde** çalıştırılır.

## Kurulum

### 1. Depoyu indirin

```powershell
git clone https://github.com/Aynur-Ad/mini-wfm.git mini-vfm
cd mini-vfm
```

### 2. Bağımlılıkları kurun

Her uygulamanın ayrı `package.json` ve `pnpm-lock.yaml` dosyası vardır.

```powershell
pnpm --dir api install --frozen-lockfile
pnpm --dir workforce-service install --frozen-lockfile
pnpm --dir notification-service install --frozen-lockfile
pnpm --dir web install --frozen-lockfile
```

### 3. Ortam dosyalarını hazırlayın

Aşağıdaki komutlar yalnızca eksik `.env` dosyalarını oluşturur:

```powershell
if (!(Test-Path api/.env)) { Copy-Item api/.env.example api/.env }
if (!(Test-Path workforce-service/.env)) { Copy-Item workforce-service/.env.example workforce-service/.env }
if (!(Test-Path notification-service/.env)) { Copy-Item notification-service/.env.example notification-service/.env }
```

`workforce-service/.env` ve `notification-service/.env` içindeki veritabanı ayarlarını Compose ile eşleştirin. Depodaki yerel geliştirme varsayılanları:

```dotenv
DB_HOST=127.0.0.1
DB_PORT=5433
DB_USER=postgres
DB_PASSWORD=mysecretpassword
DB_NAME=mini_wfm
```

İki servis aynı veritabanında ayrı şemaları kullanır. Compose kullanıcı/şifresini değiştirdiyseniz iki `.env` dosyasını da güncelleyin. Gerçek `.env` dosyaları Git'e eklenmez.

RabbitMQ ayarları iki serviste aynı olmalıdır:

```dotenv
RABBITMQ_URL=amqp://mini_wfm:local_dev_only@127.0.0.1:5672
RABBITMQ_QUEUE=work_order_events
```

Bunlar Compose'daki yerel RabbitMQ kullanıcı ve şifresidir. Workforce-service'te `EVENT_PUBLISH_TIMEOUT_MS` varsayılanı `1500` milisaniyedir.

API'nin servis bağlantıları:

```dotenv
PORT=3000
WORKFORCE_HOST=127.0.0.1
WORKFORCE_PORT=4001
NOTIFICATION_HOST=127.0.0.1
NOTIFICATION_PORT=4002
```

API'de ayrıca en az 32 karakterlik `JWT_SECRET` gerekir. Bir anahtar üretin ve çıkan değeri yalnızca `api/.env` içindeki `JWT_SECRET` alanına yazın:

```powershell
node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))"
```

Uygulamalar açılışta ortam değişkenlerini doğrular; zorunlu ayarlar eksik veya hatalıysa başlamaz.

### 4. İlk yönetici hesabını ayarlayın

İlk çalıştırmadan önce `workforce-service/.env` içindeki şu alanları doldurun:

```dotenv
INITIAL_ADMIN_USERNAME=admin
INITIAL_ADMIN_PASSWORD=
```

Şifreyi kendiniz belirleyin: en az 8 karakter, en fazla 72 UTF-8 byte olmalı ve yalnızca boşluklardan oluşmamalıdır. Hazır bir yönetici şifresi yoktur.

İlk yönetici seed migration'ıyla bir kez oluşturulur. Sonradan `.env` içindeki şifreyi değiştirmek mevcut hesabın şifresini değiştirmez. Kullanıcı adları küçük harfle saklanır.

### 5. Altyapıyı başlatın

PostgreSQL ve RabbitMQ tek komutla başlatılır:

```powershell
docker compose up -d
```

Durumu kontrol edin:

```powershell
docker compose ps
```

Mevcut Compose dosyası yalnızca altyapıyı içerir. Uygulamaların tamamını tek komutla başlatan Docker paketlemesi henüz eklenmemiştir; uygulamalar aşağıdaki gibi ayrı terminallerde çalıştırılır.

## Uygulamaları çalıştırma

PostgreSQL ve RabbitMQ hazır olduktan sonra dört ayrı terminal açın. Her terminal proje kökünde olsun.

| Terminal | Komut |
| --- | --- |
| Workforce service | `pnpm --dir workforce-service start:dev` |
| Notification service | `pnpm --dir notification-service start:dev` |
| API | `pnpm --dir api start:dev` |
| Web | `pnpm --dir web dev` |

Servisler başlarken bekleyen migration'lar otomatik uygulanır; tabloları elle oluşturmanız veya yeni migration üretmeniz gerekmez. `synchronize` kapalıdır. Bildirim servisinin migration geçmişi `notification_migrations` tablosunda ayrı tutulur.

- Swagger: http://localhost:3000/docs
- Servis kontrolü: http://localhost:3000/api/health — API ve workforce-service çalışırken `pong` döner.
- Web: http://localhost:5173
- RabbitMQ yönetimi: http://localhost:15672 — yerel kullanıcı `mini_wfm`, şifre `local_dev_only`.

Web geliştirme sunucusu `/api` isteklerini Vite proxy ile `http://localhost:3000` adresine iletir. API portunu değiştirirseniz proxy hedefini de güncelleyin.

Web'de giriş ve token yönetimi henüz bulunmadığından korunan API işlemlerini Swagger üzerinden kullanın. Frontend giriş ve rol arayüzü tamamlanana kadar web ekranlarının korunan veri istekleri `401` alabilir.

## Port listesi

| Bileşen | Port | Protokol / kullanım |
| --- | --- | --- |
| Web | 5173 | HTTP; Vite geliştirme sunucusu |
| API ve Swagger | 3000 | HTTP; `/api` ve `/docs` |
| Workforce service | 4001 | TCP |
| Notification service | 4002 | TCP |
| PostgreSQL | 5433 → 5432 | Bilgisayardan erişim → container içi port |
| RabbitMQ | 5672 | AMQP |
| RabbitMQ yönetimi | 15672 | HTTP |

## Giriş ve roller

Swagger'da `POST /api/auth/login` ile ilk yönetici hesabınızın kullanıcı adı ve şifresini gönderin. Dönen `accessToken` değerini **Authorize** alanına yapıştırın. `GET /api/auth/me` ile giriş yapan hesabı kontrol edebilirsiniz.

Yeni hesaplar ADMIN tarafından `POST /api/accounts` ile oluşturulur. `GET /api/accounts` yalnızca ADMIN'e açıktır. Login ve health dışındaki endpoint'ler token ister.

| İşlem | VIEWER | PLANNER | ADMIN |
| --- | --- | --- | --- |
| Ekip, personel, vardiya ve iş emirlerini okuma | ✓ | ✓ | ✓ |
| Puantaj, ekip önerisi, bildirim ve rapor okuma | ✓ | ✓ | ✓ |
| Ekip/personel oluşturma, güncelleme, silme ve üyelik yönetimi | — | — | ✓ |
| Hesap oluşturma ve listeleme | — | — | ✓ |
| Vardiya oluşturma, güncelleme, silme ve toplu atama | — | ✓ | ✓ |
| Rotasyon planı önizleme ve kaydetme | — | ✓ | ✓ |
| İş emri oluşturma, güncelleme ve durum değiştirme | — | ✓ | ✓ |
| IN_PROGRESS iş emrini iptal etme | — | — | ✓ |

Geçersiz veya süresi dolmuş token `401`, yetersiz rol `403` döndürür. Yetki kontrolü API'de yapılır.

## Testler

Unit ve servis testleri:

```powershell
pnpm --dir api test
pnpm --dir workforce-service test
pnpm --dir notification-service test
pnpm --dir web test
```

Backend testleri Vitest kullanır. Unit testlerde veritabanı ve istemciler mock'lanır; bildirim servisinde ayrıca yerel TCP bağlantısını kullanan bir test vardır. Bu komutlar Docker gerektirmez. Frontend testleri Vitest, JSDOM ve Testing Library ile çalışır.

Gerçek PostgreSQL entegrasyon testleri için Docker Desktop açık olmalıdır:

```powershell
pnpm --dir workforce-service test:int
pnpm --dir notification-service test:int
```

Testcontainers geçici PostgreSQL container'ları oluşturur, migration'ları uygular ve test sonunda kaynakları temizler. Testler geliştirme `.env` dosyalarını veya geliştirme veritabanını kullanmaz. İlk çalıştırmada gerekli Docker image'ları indirilir.

## Build ve lint

```powershell
pnpm --dir api build
pnpm --dir workforce-service build
pnpm --dir notification-service build
pnpm --dir web build
```

```powershell
pnpm --dir api lint
pnpm --dir workforce-service lint
pnpm --dir notification-service lint
pnpm --dir web lint
```

## Bilinen sınırlamalar

| Konu | Sınırlama |
| --- | --- |
| Token ömrü (B16) | JWT 8 saat geçerlidir; refresh token yoktur. Hesap veya rol değişikliği mevcut token'a hemen yansımaz. |
| Olay teslimi (B23) | RabbitMQ'ya yayın başarısız olduğunda ana işlem geri alınmaz. Olay kaybolabilir; COMMIT ile yayın arasındaki süreç kapanması da kayba neden olabilir. Outbox yoktur. |
| Saat dilimi (B25) | Yerel hesaplamalar ayardan gelen sabit UTC farkını kullanır; Türkiye için UTC+3'tür. Yaz saati değişimleri desteklenmez. |
| Frontend kimlik doğrulaması (F7) | Giriş ve token yönetimi henüz uygulanmamıştır. Tasarımda öngörülen localStorage kullanımı XSS durumunda token'ın çalınması riskini taşır; httpOnly cookie yaklaşımı kapsam dışındadır. |
| Vardiyada ekip filtresi (MWFM-29) | Personelin güncel ekibine göre çalışır. Geçmiş ekip üyeliği saklanmadığı için vardiya tarihindeki ekip üyeliğini göstermez. |
| Puantaj takvimi | Resmî tatil verisi 2026–2027 ile sınırlıdır. |
| Rotasyon | Greedy planlama kullanılır; her durumda en iyi planı bulma garantisi yoktur. |
| Mevcut kapsam | Uygulama Docker paketlemesi, frontend giriş/rol kontrolü ve iş emri ekranları henüz eklenmemiştir. |

## Durdurma ve sorun giderme

Uygulama terminallerini `Ctrl+C` ile durdurun. Altyapıyı kapatmak için:

```powershell
docker compose down
```

Volume'ler silinmediği için veriler korunur.

| Durum | Kontrol |
| --- | --- |
| Veritabanı bağlantı hatası | Docker Desktop'ı, `docker compose ps` çıktısını ve iki servisin DB ayarlarını kontrol edin. |
| RabbitMQ bağlantı hatası | `docker compose logs rabbitmq` ile broker'ı kontrol edin; URL kullanıcı/şifresi ve kuyruk adı iki serviste eşleşmeli. |
| `401` / `403` | Token'ın geçerliliğini ve hesabın rolünü Swagger'da kontrol edin. |
| `503` | İlgili TCP servisi açık mı ve API'nin host/port ayarları doğru mu kontrol edin. |
| Bildirim oluşmuyor | Atanan ekibin aktif üyelerini, notification-service loglarını ve `work_order_events` kuyruğunu kontrol edin. |
| Port kullanımda | Önceden açık kalmış geliştirme sürecini durdurun. |
| Entegrasyon testinde container runtime bulunamıyor | Docker Desktop Linux container modunda açık olmalı; `docker info` çalışmalı. |