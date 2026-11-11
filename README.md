# Mini WFM

Mini WFM, ekip ve personel kayıtlarının yönetildiği bir staj projesidir. Ekip ve personel oluşturma, listeleme, detay görüntüleme, güncelleme ve silme işlemlerini içerir.

Proje üç uygulamadan oluşur:

- **web:** React arayüzüdür. Ekip ve personel ekranlarını gösterir ve API üzerinden veri alır.
- **api:** HTTP isteklerini karşılar, gelen veriyi DTO kurallarıyla doğrular ve TCP üzerinden workforce-service'e iletir. Veritabanına bağlanmaz.
- **workforce-service:** İş kurallarını uygular ve TypeORM üzerinden PostgreSQL'e erişir.

Komutlar **Windows PowerShell** içindir. Aksi belirtilmedikçe komutları `api`, `workforce-service` ve `docker-compose.yaml` dosyasının bulunduğu **proje kökünde** çalıştırın.

## Gereksinimler

| Araç | Açıklama |
| --- | --- |
| Node.js | 24.x; kod 24.22.x ile kontrol edildi |
| pnpm | 10 veya üzeri; hazırlanan sürüm 11.25.0 ile kontrol edildi |
| Git | Depoyu indirmek ve sürüm kontrolü için |
| Docker Desktop ve Docker Compose | PostgreSQL'i çalıştırmak için |
| Tarayıcı | Web arayüzünü ve Swagger'ı kullanmak için |
| DBeaver veya benzeri araç | İsteğe bağlı; veritabanını incelemek için |

Nest CLI proje bağımlılıklarında bulunduğu için ayrıca global kurulması gerekmez. Docker komutlarını çalıştırmadan önce Docker Desktop'ı açın.

Araçları kontrol etmek için:

```powershell
node --version
pnpm --version
git --version
docker --version
docker compose version
```

## 1. Projeyi indirme

GitHub deposunda **Code → HTTPS** adresini kopyalayın.

```powershell
git clone https://github.com/Aynur-Ad/mini-wfm mini-vfm
cd mini-vfm
```

Depo zaten bilgisayarınızdaysa mevcut proje klasörünü açın.

## 2. Bağımlılıkları kurma

Her uygulamanın ayrı `package.json` ve kilit dosyası vardır. Üç uygulamanın bağımlılıklarını proje kökünden kurun:

```powershell
pnpm --dir api install --frozen-lockfile
pnpm --dir workforce-service install --frozen-lockfile
pnpm --dir web install --frozen-lockfile
```

## 3. Veritabanı bağlantısını hazırlama

İlk kurulumda örnek ortam dosyasını kopyalayın:

```powershell
Copy-Item workforce-service/.env.example workforce-service/.env
Copy-Item api/.env.example api/.env
```

Mevcut bir `.env` dosyanız varsa yeniden kopyalamak yerine içeriğini kontrol edin.

`.env.example` dosyasındaki kullanıcı ve şifre yer tutucudur. `workforce-service/.env` içeriğini, depodaki `docker-compose.yaml` ile uyumlu şekilde düzenleyin:

```dotenv
DB_HOST=localhost
DB_PORT=5433
DB_NAME=mini_wfm
DB_USER=postgres
DB_PASSWORD=mysecretpassword
INITIAL_ADMIN_USERNAME=admin
INITIAL_ADMIN_PASSWORD=
```

Bu değerler depodaki **yerel geliştirme** Compose ayarlarıdır. Compose kullanıcı veya şifresini değiştirdiyseniz `.env` değerlerini de eşleştirin. `.env` Git'e eklenmez; `.env.example` depoda kalır.

`INITIAL_ADMIN_PASSWORD` alanını ilk çalıştırmadan önce kendi belirleyeceğiniz bir şifreyle doldurun. Şifre en az 8 karakter, en fazla 72 UTF-8 byte olmalı ve yalnızca boşluklardan oluşmamalıdır. Hazır bir yönetici şifresi tanımlı değildir. `INITIAL_ADMIN_USERNAME` varsayılan olarak `admin` olur; kullanıcı adları küçük harfle saklanır.

İlk yönetici hesabı ayrı bir seed migration'ıyla yalnızca bir kez oluşturulur. Sonraki açılışlarda `.env` şifresini değiştirmek mevcut hesabın şifresini güncellemez. Seed migration'ını geri alırken aynı ilk yönetici kullanıcı adı ayarını kullanın.

API veritabanına bağlanmaz. `api/.env`, PORT=3000, WORKFORCE_HOST=127.0.0.1 ve WORKFORCE_PORT=4001 ayarlarını içerir. API hedef portu ile servisin dinlediği port eşleşmelidir.

`api/.env` dosyasına ayrıca `JWT_SECRET` ekleyin. En az 32 karakterlik kendi rastgele imza anahtarınızı kullanın; varsayılan bir anahtar yoktur. Aşağıdaki komutla 32 rastgele byte'tan 64 karakterlik hex anahtar üretebilirsiniz:

```powershell
node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))"
```

Üretilen değeri yalnızca kendi `.env` dosyanızdaki `JWT_SECRET=` alanına yazın. Gerçek anahtarı `.env.example`, kaynak kod veya PR içine koymayın. Anahtar eksik ya da kısaysa API başlamaz. Workforce-service JWT anahtarına ihtiyaç duymaz.


## 4. PostgreSQL'i başlatma

Docker Desktop açıkken proje kökünde:

```powershell
docker compose up -d
```

Container durumunu kontrol edin:

```powershell
docker compose ps
```

PostgreSQL'in hazır olması için birkaç saniye bekleyin. Gerektiğinde logları görüntüleyin:

```powershell
docker compose logs postgres
```

Veriler Docker volume'ünde saklanır; normal durdurma ve yeniden başlatmada korunur.

## 5. Uygulamaları çalıştırma

PostgreSQL hazır olduktan sonra üç ayrı terminal açın. Her terminalin başlangıç konumu proje kökü olmalıdır.

### Terminal 1 — Workforce service

```powershell
pnpm --dir workforce-service start:dev
```

Servis **4001** portunu TCP üzerinden dinler. Bu port tarayıcıdan açılan bir HTTP adresi değildir.

Servis açılırken bekleyen migration'lar otomatik çalışır; ilk kurulumda `workforce` şeması ve tablolar oluşturulur. `synchronize` kapalıdır. İlk kurulum için yeni migration üretmeniz veya tabloları elle oluşturmanız gerekmez.

### Terminal 2 — API

```powershell
pnpm --dir api start:dev
```

API varsayılan olarak **3000** portunu kullanır. Ortamda `PORT` değişkeni tanımlanmışsa bu değer kullanılır.

- Swagger: [http://localhost:3000/docs](http://localhost:3000/docs)
- Servis bağlantı kontrolü: [http://localhost:3000/api/health](http://localhost:3000/api/health)

İki uygulama da çalışırken health isteği **200** koduyla `pong` döndürmelidir. API endpoint'leri `/api` önekiyle başlar. Ana adreste `/` bir karşılama ekranı bulunması beklenmez.

### Terminal 3 — Web

```powershell
pnpm --dir web dev
```

Tarayıcıda [http://localhost:5173](http://localhost:5173) adresini açın. Port doluysa Vite başka bir port seçebilir; terminalde gösterilen adresi kullanın. Ana adres ekip listesine (`/teams`) yönlenir.

Vite, `/api` ile başlayan istekleri `http://localhost:3000` adresine yönlendirir. Frontend HTTP istemcisinin temel yolu `/api` olarak tanımlıdır. Mevcut ayarlarla frontend için ayrıca `.env` dosyası oluşturmanız gerekmez.

Ekip listesi `/teams`, personel listesi `/workforce-users` adresindedir. Personel sicil numarasına tıklanınca `/workforce-users/:id` detay sayfası açılır.

### Komutları uygulamanın kendi klasöründe çalıştırma

Yukarıdaki `--dir` komutları proje kökü içindir. Terminal zaten ilgili uygulama klasöründeyse aşağıdaki komutları kullanın; tekrar `--dir web` gibi bir klasör belirtmeyin.

| Bulunduğunuz klasör | Çalıştırma komutu |
| --- | --- |
| `workforce-service` | `pnpm run start:dev` |
| `api` | `pnpm run start:dev` |
| `web` | `pnpm run dev` |

Web klasöründe derleme ve lint kontrolü için sırasıyla `pnpm run build` ve `pnpm run lint` çalıştırın. Her uygulamayı ayrı terminalde açık tutun.

## Port listesi

| Bileşen | Port | Kullanım |
| --- | --- | --- |
| API | 3000 | HTTP endpoint'leri ve Swagger |
| Workforce service | 4001 | TCP mesajlaşması |
| PostgreSQL — bilgisayardan erişim | 5433 | `.env` ve DBeaver bağlantısı |
| PostgreSQL — container içi | 5432 | Container içindeki PostgreSQL portu |
| Web | 5173 | HTTP; React/Vite geliştirme sunucusu |

Swagger ayrı port kullanmaz; API ile aynı portta `/docs` yolundadır.

## Testleri çalıştırma

Backend unit testleri **Vitest** kullanır. Repository ve TCP istemcisi gibi bağımlılıklar mock'landığından testler için PostgreSQL'in veya diğer uygulamanın çalışması gerekmez.

Proje kökünde:

```powershell
pnpm --dir api test
pnpm --dir workforce-service test
```

İzleme modunda çalıştırmak için, her komutu ayrı terminalde kullanın:

```powershell
pnpm --dir api test:watch
pnpm --dir workforce-service test:watch
```

Test kapsamı raporu için:

```powershell
pnpm --dir api test:cov
pnpm --dir workforce-service test:cov
```

Unit testlerin geçmesi, gerçek PostgreSQL bağlantısının ve migration'ların da çalıştığını tek başına doğrulamaz. Bunun için uygulamalar açıkken Swagger kontrolü yapın.

### Entegrasyon testleri

Workforce-service entegrasyon testleri, Testcontainers ile her test dosyası için geçici bir PostgreSQL container'ı açar ve mevcut migration'ları uygular. Testler `.env` veya geliştirme veritabanını kullanmaz. Her testten sonra iş tabloları temizlenir; dosya tamamlandığında bağlantı ve container kapatılır.

Docker Desktop açık ve Linux container modunda olmalıdır. API, workforce-service ve Compose veritabanını çalıştırmak gerekmez. İlk çalıştırmada `postgres:16-alpine` image'ı ve Testcontainers'ın kaynak temizleme bileşeni indirilebilir.

Proje kökünde:

```powershell
pnpm --dir workforce-service test:int
```

Normal `pnpm --dir workforce-service test` yalnızca unit testleri çalıştırır ve Docker gerektirmez. Entegrasyon testleri `src/test` altında `.int-spec.ts` uzantısıyla bulunur ve ayrı `vitest.config.int.ts` ayarıyla çalışır.

Testler ekip adı tekilliğini, arama/sayfalamayı, üyelik/silme kurallarını, kullanıcı hesaplarını ve vardiya çakışmalarını kontrol eder. Vardiyalarda uç uca saatler, kendini hariç tutan güncelleme, paralel create/update ve personel silme FK kuralı da sınanır. Liste sorgusunda gece vardiyası, aralık sınırları, birlikte filtreleme, güncel ekip sınırlaması ve tek SELECT ile ilişkili verinin yüklenmesi doğrulanır. Toplu atamada tüm çakışan üyeler, pasif üyelerin hariç tutulması, eşzamanlı istekler ve DB hatasında hiçbir kayıt kalmaması da sınanır. Migration'ların geri alınıp tekrar uygulanması ayrıca doğrulanır. Unit testlerden farklı olarak repository ve PostgreSQL bağlantısı gerçektir.

Geliştirme veritabanından bağımsızlığı doğrulamak için uygulamaları durdurup `docker compose stop postgres` çalıştırın; ardından `test:int` komutunu tekrar çalıştırın. Compose verileri korunur. Normal geliştirmeye dönmek için `docker compose up -d` kullanın.

Test sırasına bağımlılığı kontrol etmek için farklı seed değerleriyle çalıştırabilirsiniz:

```powershell
pnpm --dir workforce-service test:int --sequence.shuffle --sequence.seed=42
pnpm --dir workforce-service test:int --sequence.shuffle --sequence.seed=73
```

`Could not find a working container runtime strategy` hatasında Docker Desktop'ın çalıştığını ve `docker info` komutunun başarılı olduğunu kontrol edin. Image indirme hatalarında ağ bağlantısını kontrol edin. Test veritabanının adresini `.env` dosyasına yazmayın.

### Frontend testleri

Frontend testleri **Vitest**, **JSDOM** ve **Testing Library** kullanır. Proje kökünde:

```powershell
pnpm --dir web test
```

İzleme modunda `pnpm --dir web test:watch` kullanın. Terminal zaten `web` klasöründeyse `pnpm test` veya `pnpm run test:watch` yeterlidir. Test bağımlılıklarını kurmak için güncel `package.json` ve `pnpm-lock.yaml` dosyalarını birlikte alın; `web` klasöründe `pnpm install --frozen-lockfile` çalıştırın.

Frontend testlerinde API cevapları taklit edilir. Testler için backend veya PostgreSQL açık olmak zorunda değildir; gerçek tarayıcı ve servis bağlantısı aşağıdaki ekran kontrolleriyle ayrıca doğrulanmalıdır.

## Derleme ve lint

Üç uygulamanın derlemesini kontrol edin:

```powershell
pnpm --dir api build
pnpm --dir workforce-service build
pnpm --dir web build
```

Lint kontrolleri:

```powershell
pnpm --dir api lint
pnpm --dir workforce-service lint
pnpm --dir web lint
```

Lint çıktısındaki hata ve uyarıları kontrol edin; hataları giderdikten sonra komutu yeniden çalıştırın.

## Giriş ve kimlik doğrulama

`POST /api/auth/login` kullanıcı adı ve şifreyle giriş yapar. Doğrulama workforce-service'te, JWT üretimi ve token kontrolü API'de yapılır. Başarılı yanıt `accessToken`, saniye cinsinden `expiresIn` (28800) ve `user` alanlarını içerir. Kullanıcı bilgisi yalnızca `id`, `username` ve `role` içerir; şifre/hash döndürülmez.

Swagger'da önce **Auth → POST /api/auth/login → Try it out** üzerinden mevcut bir hesapla giriş yapın. İlk yönetici için `.env` içinde belirlediğiniz kullanıcı adı ve şifreyi kullanabilirsiniz. Dönen `accessToken` değerini **Authorize** alanına yapıştırın; Swagger Bearer önekini kendisi ekler.

`GET /api/auth/me` token sahibinin ID, kullanıcı adı ve rolünü döndürür. Login ve health dışındaki API endpoint'leri geçerli bir token ister. Token yoksa, imza bozulmuşsa veya süre dolmuşsa `401` döner. Hatalı kullanıcı adı, hatalı şifre ve pasif hesapla girişte aynı `Kullanıcı adı veya şifre hatalı` mesajı kullanılır. Biçimsel olarak geçersiz istek gövdeleri `400` döndürür.

Token 8 saat geçerlidir; refresh token yoktur. Süre dolunca tekrar giriş yapılır. Token içinde kullanıcı bilgisine ek olarak standart `iat` ve `exp` zaman alanları bulunur. `/auth/me` veritabanına tekrar sorgu atmadan token'daki kimliği gösterir; hesap/rol sonradan değiştiğinde mevcut token süresi dolana kadar eski bilgiyi taşır.

Kimlik doğrulamadan sonra rol kontrolü yapılır. Token geçerli olduğu halde rolün izni yoksa `403` ve `Bu işlem için yetkiniz yok` mesajı döner. Web arayüzünün giriş ve token yönetimi henüz eklenmediğinden bu kontrolleri Swagger üzerinden yapın.

### Roller ve izinler

| İşlem | VIEWER | PLANNER | ADMIN |
| --- | --- | --- | --- |
| Ekip ve personel listeleri/detayları | Evet | Evet | Evet |
| Kendi kullanıcı bilgisini görme (`GET /api/auth/me`) | Evet | Evet | Evet |
| Ekip ve personel oluşturma, güncelleme, silme | Hayır | Hayır | Evet |
| Ekip üyeliği ekleme ve kaldırma | Hayır | Hayır | Evet |
| Hesap oluşturma ve listeleme | Hayır | Hayır | Evet |
| Vardiya listesi ve detayı | Evet | Evet | Evet |
| Vardiya oluşturma, güncelleme ve silme | Hayır | Evet | Evet |
| Ekibe toplu vardiya atama | Hayır | Evet | Evet |

İzinler API controller'larında `@Roles(...)` ile tanımlanır. `JwtGuard` önce token'ı doğrular; ardından `RolesGuard` doğrulanan kullanıcının rolünü kontrol eder. `@Roles` tanımı olmayan endpoint'ler varsayılan olarak yalnızca admin'e açıktır. `@Public()` ile işaretli login ve health bu kontrolden muaftır. Hesap listesi GET olmasına rağmen yalnızca admin'e açıktır; yalnızca HTTP metoduna bakarak izin verilmez.

Swagger'da admin hesabıyla giriş yapıp bir `VIEWER` ve bir `PLANNER` hesabı oluşturun. Her hesap için login'den token alın; Authorize içindeki önceki token'ı değiştirin. Viewer ekip listesini okuyabilmeli, ekip oluştururken `403` almalıdır. Planner da ekip/personel kayıtlarını okuyabilir; bunları değiştiremez ve hesap listesini göremez. Admin tüm mevcut işlemleri kullanabilir. Swagger endpoint açıklamaları izin verilen rolleri gösterir.

Butonları arayüzde gizlemek doğrudan HTTP isteği gönderilmesini engellemez. İzin kontrolü backend'de yapılır ve yetkisiz istek workforce-service'e iletilmez. İş emri ve rapor endpoint'leri eklendiğinde kendi izinleri ayrıca tanımlanacaktır.

### Servisler arasında kullanıcı bilgisi

Korunan bir istekte JWT guard'ın doğruladığı kullanıcı, TCP mesajına `{ id, username, role }` biçiminde `actor` alanıyla eklenir. İstek kimliği aynı zarfın `correlationId` alanında kalır. Login ve health gibi anonim çağrılarda `actor` null olur. Workforce-service token almaz; actor bilgisini istek kapsamında tutar.

Korumalı HTTP isteklerinin loglarında doğrulanan `userId`, servis mesajı alındı loglarında `actorId` görülür. Şifre, JWT ve imza anahtarı loglanmaz.

## Swagger üzerinden ilk kontrol

Swagger'da giriş yapıp Authorize alanına token ekledikten sonra endpoint'i açıp **Try it out → Execute** ile istek gönderin.

| Kaynak | Oluşturma | Liste | Detay | Güncelleme | Silme |
| --- | --- | --- | --- | --- | --- |
| Ekip | POST `/api/teams` | GET `/api/teams` | GET `/api/teams/:id` | PATCH `/api/teams/:id` | DELETE `/api/teams/:id` |
| Personel | POST `/api/workforce-users` | GET `/api/workforce-users` | GET `/api/workforce-users/:id` | PATCH `/api/workforce-users/:id` | DELETE `/api/workforce-users/:id` |

Daha önce kullanılmamış bir sicil numarasıyla personel oluşturun:

```json
{
  "firstName": "Deniz",
  "lastName": "Kaya",
  "registrationNumber": "P1001",
  "phone": "5321234567"
}
```

Beklenen davranışlar:

- Oluşturma: **201** ve oluşturulan personel.
- Aynı sicille ikinci kayıt: **409**.
- Telefon gönderilmişse 5 ile başlayan tam 10 rakam olmalıdır; hatalı telefon: **400**.
- Dönen `id` ile detay: **200**; olmayan personel: **404**.
- PATCH yalnızca gönderilen alanları değiştirir. `isActive: false` personeli pasife alır.
- Liste sorgusunda `page`, `limit`, `search` ve `isActive` kullanılabilir. Arama ad, soyad veya sicilde yapılır. Varsayılan limit 10, en büyük limit 100'dür.
- Personel silme: **204** ve boş gövde. Silinen kaydın detayı: **404**.

## Personel ekranlarını kontrol etme

Üç uygulama ve PostgreSQL açıkken web menüsünden **Personeller** sayfasına girin.

- **Liste:** Sicil No, Ad Soyad, Telefon, Durum ve İşlemler kolonları gösterilir. Telefon `532 123 45 67` biçimindedir; boş telefon `-` görünür. Liste sunucudan sayfalı alınır.
- **Arama ve filtre:** Ad, soyad veya sicilin bir kısmıyla arayın. Arama, yazma durduktan 400 ms sonra gönderilir. Tümü/Aktif/Pasif filtresi aramayla birlikte çalışır; filtre değişince ilk sayfaya dönülür.
- **Oluşturma ve düzenleme:** Yeni Personel veya Düzenle butonunu kullanın. Ad/soyad zorunlu ve en fazla 100, sicil zorunlu ve en fazla 20 karakterdir. Telefon isteğe bağlıdır; girilirse 5 ile başlayan 10 rakam olmalıdır. Boşluklardan oluşan zorunlu alanlar kabul edilmez.
- **Hata ve başarı:** Başarılı kayıtta liste/detay güncellenir. Tekrarlanan sicilde backend'in 409 bildirimi gösterilir ve formdaki değerler korunur. Düzenlemede telefonu boşaltmak mevcut numarayı temizler.
- **Durum:** Satırdaki anahtarla aktif/pasif durumunu değiştirin. Sayfayı yenileyerek değişikliğin korunduğunu kontrol edin.
- **Silme:** Önce onaydan vazgeçin; kayıt kalmalıdır. Ardından onaylayın; kayıt listeden kalkmalıdır. Son sayfanın son kaydı silinirse geçerli önceki sayfaya dönülür.
- **Detay:** Sicil bağlantısından personel bilgilerini açın. Düzenleme sonrası bilgilerin güncellendiğini kontrol edin. Veritabanında bulunmayan bir ID için Personel bulunamadı ekranı ve Listeye dön butonu gösterilir. Bağlantı/sunucu hatalarında ayrı bir hata ekranı ve yeniden deneme bulunur.

Bu kontroller gerçek servisler ve veritabanıyla yapılır. Frontend build/lint kontrolü veya mock kullanılan testler tek başına bu uçtan uca kontrolün yerini tutmaz.

## Personelin ekibe atanması

`workforce_user.team_id` nullable bir foreign key'dir. Bir personel en fazla bir ekibe bağlıdır; bir ekip birden fazla personel içerir. Atanmamış personelde `teamId` ve `team` null döner. Ekipten çıkarmak personel kaydını silmez.

Ekip üyeliği ilişkisi `1793777421380-AddWorkforceUserTeam.ts` migration'ıyla tanımlanır. Workforce service başladığında bekleyen migration otomatik çalışır. Mevcut tablonuzu silmeyin ve aynı değişiklik için tekrar migration üretmeyin.

İki servis açıkken Swagger'daki Teams bölümünden şu işlemleri deneyin. Adreslerde ve body'de kendi kayıtlarınızın gerçek ID değerlerini kullanın:

| İşlem | Endpoint | Başarılı cevap |
| --- | --- | --- |
| Ekibe ata | POST `/api/teams/:id/members` | 201; güncel personel ve ekip özeti |
| Ekipten çıkar | DELETE `/api/teams/:id/members/:workforceUserId` | 204; boş gövde |

POST body örneği:

```json
{
  "workforceUserId": 10
}
```

Atanacak ekip ID değeri URL'den alınır. `teamId`, personel oluşturma/güncelleme DTO'sunda yer almaz; üyelik yalnızca yukarıdaki endpoint'lerle değiştirilir.

- Ekip veya personel yoksa 404 döner.
- Atama ve çıkarma için ekip ve personel aktif olmalıdır; pasif kayıtta 409 döner. Pasif bir üyenin çıkarılması gerekiyorsa önce ilgili kayıtları aktif hale getirin.
- Personel zaten aynı veya başka ekibe bağlıysa atama 409 döner; mesaj mevcut ekibin adını ve ID değerini içerir.
- Çıkarılmak istenen personel belirtilen ekipte değilse 404 döner.
- Aktif veya pasif üyesi bulunan ekip silinemez; 409 döner.
- GET `/api/teams/:id` cevabı `members` dizisini içerir; üye yoksa dizi boştur.
- GET `/api/workforce-users` ve GET `/api/workforce-users/:id` cevaplarında her personelde `teamId` ile `team: { id, name }` veya `team: null` bulunur.

Ekip üyeliği işlemleri, bu endpoint'leri kullanan ekip detay ekranından da yönetilebilir.

## Ekip üyelerini ekrandan yönetme

Ekip listesinden bir ekibin detayını açın. **Üyeler** tablosu sicil numarası, ad soyad ve telefonu gösterir. Sicil bağlantısı personel detayını açar. Telefon diğer ekranlarla aynı biçimde gösterilir.

- **Üye Ekle:** Ad, soyad veya sicille arama yapılabilen modal açılır. Personeller sunucudan sayfalı alınır; arama 400 ms bekleyerek gönderilir. Aktif ve atanmamış bir personeli seçip Ekle ile kaydedin.
- **Seçim kısıtları:** Başka ekipteki personelin ekip adı etiket olarak görünür ve seçim kapalıdır. Mevcut üyeler ile pasif personeller de seçilemez.
- **Pasif ekip:** Üye Ekle butonu devre dışıdır. Üzerine gelince nedenini açıklayan mesaj görünür. Üyelik kuralları gereği pasif ekipte veya pasif personelde çıkarma da kapalıdır.
- **Çıkar:** Üyenin satırındaki Çıkar butonu onay ister. Vazgeçmek isteği göndermez. Onaydan sonra yalnızca üyelik kaldırılır, personel kaydı korunur.
- **Güncel veriler:** Başarılı ekleme/çıkarma ekip üyelerini ve personel sorgularını yeniler; sayfayı elle yenilemek gerekmez. Personel listesindeki Ekip kolonu ekip adına ve detay bağlantısına, atanmamış kayıtlarda ise çizgiye yer verir.
- **Eşzamanlı değişiklik:** Backend 404/409 döndürürse güncel üyelik bilgileri yeniden alınır. Başka kullanıcının arada atadığı personel tekrar seçilemez; hata mesajı mevcut ortak HTTP istemcisinden gösterilir.

Yerel kontrol: Bir personeli ekleyin, personel listesindeki ekip bilgisini kontrol edin, çıkarma onayından önce vazgeçin ve sonra onaylayın. Kayıt silinmeden ekip bilgisinin boşaldığını doğrulayın. Başka ekibe atanmış/pasif personelleri ve pasif ekibin buton açıklamasını da deneyin.

## Kullanıcı hesapları

Hesaplar uygulamaya giriş yapacak kullanıcıları temsil eder; personel kayıtlarından ayrıdır. Kullanıcı adı, rol ve aktiflik bilgisiyle birlikte `workforce.account` tablosunda tutulur. Roller `ADMIN`, `PLANNER` ve `VIEWER` değerleridir. Hesap oluşturma ve listeleme yalnızca `ADMIN` rolüne açıktır; geçerli token taşıyan `VIEWER` ve `PLANNER` kullanıcıları da bu uçlardan `403` alır.

| İşlem | Endpoint | Açıklama |
| --- | --- | --- |
| Hesap oluşturma | POST `/api/accounts` | Kullanıcı adı, şifre ve rol alır; `201` döndürür. |
| Hesap listesi | GET `/api/accounts` | Sayfalı hesap listesi döndürür. |

Swagger'da admin hesabıyla giriş yaptıktan sonra **Accounts** bölümünden bir kullanıcı adı, kurallara uygun şifre ve rol girerek hesap oluşturabilirsiniz. Kullanıcı adı en fazla 50 karakterdir; baştaki/sondaki boşluklar temizlenir ve küçük harfe çevrilir. `Ali` ve `ali` aynı kullanıcı adı sayılır; tekrarında `409` döner. Listede `page`, `limit`, `search` ve `isActive` parametreleri kullanılabilir.

Şifreler bcrypt ile hash'lenir; `password_hash` alanı veritabanında `$2b$12$` ile başlayan bir değer içerir. Oluşturma, listeleme ve kimlik doğrulama yanıtlarında şifre veya hash bulunmaz. Hash'in yanında ayrı bir düz metin şifre alanı tutulmaz.

Workforce-service'teki `validateCredentials` TCP mesajı kullanıcı adı ve şifreyi doğrular. Hatalı kullanıcı adı, hatalı şifre ve pasif hesap için aynı `401` mesajı döner. API giriş endpoint'i bu mesajı kullanarak doğrulama yapar ve JWT üretir.

Entegrasyon testleri hesap tablosunu ve ilk yönetici migration'ını da kapsar. Test yönetici şifresi rastgele üretilir; gerçek `.env` kullanılmaz. Her testten sonra hesaplar temizlenir ve test yöneticisi yeniden oluşturularak aynı başlangıç durumu korunur.

## Vardiya işlemleri

Vardiya bir personelin başlangıç ve bitiş anları arasındaki çalışma kaydıdır. `workforce.shift` tablosunda personel ID, başlangıç/bitiş, en fazla 500 karakterlik not ve oluşturan hesap tutulur. Oluşturan hesap istek gövdesinden değil, doğrulanmış TCP `actor` bilgisinden alınır. Güncellemede `createdById` korunur.

| İşlem | Endpoint | İzin verilen roller | Başarı |
| --- | --- | --- | --- |
| Oluşturma | POST `/api/shifts` | ADMIN, PLANNER | 201 |
| Liste | GET `/api/shifts` | ADMIN, PLANNER, VIEWER | 200; dizi |
| Detay | GET `/api/shifts/:id` | ADMIN, PLANNER, VIEWER | 200 |
| Kısmi güncelleme | PATCH `/api/shifts/:id` | ADMIN, PLANNER | 200 |
| Silme | DELETE `/api/shifts/:id` | ADMIN, PLANNER | 204; gövdesiz |
| Ekibe toplu atama | POST `/api/teams/:id/shifts` | ADMIN, PLANNER | 201; oluşturulan vardiya dizisi |

`workforceUserId`, `startAt` ve `endAt` oluştururken zorunludur. Güncellemede yalnızca gönderilen alanlar değişir; `note: null` notu temizler. Tarihler saat dilimi belirtilmiş ISO 8601 olmalıdır: örneğin `2099-01-02T08:00:00+03:00` ve `2099-01-02T16:00:00+03:00`. Saat dilimi belirtilmemiş tarih kabul edilmez. Yanıt aynı anları UTC `Z` biçiminde döndürür; bu örnekte başlangıç `2099-01-02T05:00:00.000Z` olur. Ekranda yerel saate çevirme işi frontend'e aittir; API gösterim için üç saat eklemez.

Vardiya en az 1, en fazla 12 saat sürmelidir (`400`). Geçmişe ekleme veya başlangıcı geçmiş vardiyayı güncelleme/silme `409` döndürür; başlamış vardiya geleceğe taşınarak bu kural aşılamaz. Personel yoksa `404`, hedef personel pasifse `409` döner. Pasif personele ait vardiyayı silmek için de önce personelin aktif olması gerekir.

Aynı personelin aralıkları `mevcut.startAt < yeni.endAt && mevcut.endAt > yeni.startAt` ise çakışır. Örneğin 08:00–16:00 ile 12:00–20:00 çakışır; 16:00–22:00 çakışmaz. Çakışma yanıtı `409` ve çakışan vardiyanın UTC saatlerini içerir. Kendi saatleriyle güncellemede aynı vardiya çakışma sayılmaz. Personel satırı transaction içinde kilitlenerek eşzamanlı API yazmalarının kontrolü atlaması önlenir.

Vardiyası olan personel, vardiya geçmişte olsa da silinemez (`409`). Foreign key doğrudan SQL ile silmeyi de engeller. Takvim arayüzü henüz eklenmemiştir; kontroller Swagger'daki **Shifts** bölümünden yapılır.

### Ekibe toplu vardiya atama

`POST /api/teams/:id/shifts` gövdesi `startAt`, `endAt` ve opsiyonel `note` alır. Üye ID'leri client'tan alınmaz; ekipteki tüm aktif personeller servis tarafından seçilir. Ekip yoksa `404`, pasifse veya aktif üyesi yoksa `409` döner. Tekil vardiyadaki ISO tarih/saat, 1–12 saat süre ve geçmişe eklememe kuralları burada da geçerlidir. Başarı yanıtı oluşturulan vardiyaların dizisidir; her kaydın `createdById` değeri doğrulanmış actor'dan gelir.

Atama tek transaction içindedir. Üyelik işlemleriyle aynı sırada önce ekip, sonra personeller ID sırasıyla kilitlenir. Böylece üyelik değişiklikleri ve aynı personele tekil/toplu vardiya istekleriyle çakışma kontrolü korunur. Önce tüm aktif üyelerin çakışmaları kontrol edilir; biri bile çakışırsa hiçbir vardiya eklenmez. Pasif üyeler hem atamadan hem çakışma listesinden hariçtir.

Çakışmada hata biçimi opsiyonel `details` alanını içerir:

```json
{
  "statusCode": 409,
  "message": "Ekip üyelerinin mevcut vardiyalarıyla çakışma var",
  "details": [
    {
      "workforceUserId": 7,
      "registrationNumber": "P007",
      "firstName": "Deniz",
      "lastName": "Kaya"
    }
  ]
}
```

`details` tüm çakışan aktif üyeleri, personel başına tek kayıtla içerir; yalnızca ilk çakışma döndürülmez. Bu alanı taşımayan eski hatalar `{ statusCode, message }` biçiminde kalır. Şifre, token veya telefon gibi alanlar details'e eklenmez; details istek/hata loglarına yazılmaz.

Swagger'da üç aktif üyeli bir ekip oluşturun. Bir üyeye tekil vardiya ekleyip aynı saatlere toplu atamayı deneyin: `409` ve ilgili personelin adı/sicili dönmeli. `GET /api/shifts` veya DBeaver'dan diğer üyelere hiçbir yeni kayıt yazılmadığını doğrulayın. Çakışmayan saatlerle deneyince aktif üye sayısı kadar vardiya ve `201` beklenir. Pasif üyeye vardiya eklenmemelidir.

### Tarih aralığına göre vardiya listesi

`GET /api/shifts` için `from` ve `to` zorunludur. Tarihler ISO 8601 ve açık saat dilimi içermelidir; `to`, `from` sonrasında olmalı ve aralık en fazla 31 × 24 saat olmalıdır. Eksik/geçersiz/boş/ters veya daha uzun aralık `400` döndürür. Geçmiş vardiyalar da sorgulanabilir; personelin pasif olması liste kaydını gizlemez.

| Query | Açıklama |
| --- | --- |
| from | Başlangıç anı, ör. `2099-01-02T00:00:00+03:00` |
| to | Bitiş anı, ör. `2099-01-03T00:00:00+03:00` |
| workforceUserId | Opsiyonel pozitif tam sayı; yalnızca bu personelin vardiyaları |
| teamId | Opsiyonel pozitif tam sayı; personelin güncel ekibine göre filtre |

Sorgu `[from, to)` aralığıyla gerçekten kesişen kayıtları döndürür: `shift.startAt < to AND shift.endAt > from`. Tam `from` anında biten veya tam `to` anında başlayan vardiya dahil edilmez. Önceki gün 23:00'te başlayıp ertesi gün 07:00'de biten vardiya her iki günün sorgusunda da görünür. Tarihler farklı saat farklarıyla gönderilse de aynı UTC anı üzerinden karşılaştırılır.

Yanıt sayfalama zarfı olmadan doğrudan dizidir; sonuç yoksa `[]` döner. Kayıtlar `startAt ASC`, eşitlikte `id ASC` sırasındadır. Her vardiya kendi alanlarına ek olarak `workforceUser: { id, firstName, lastName, team: { id, name } | null }` içerir. Personel ve ekip tek SQL sorgusunda join ile yüklenir; her satır için ayrı sorgu atılmaz. Telefon, sicil, hesap şifresi/hash gibi alanlar listeye eklenmez.

İki filtre birlikte verilirse AND ile uygulanır. Geçerli fakat eşleşmeyen personel/ekip ID'si `[]` döndürür. Ekibi olmayan personelin vardiyası filtresiz listede kalır; `team` null olur.

**Ekip geçmişi sınırlaması:** Vardiyada o tarihteki ekip saklanmaz. Personel başka ekibe taşınırsa eski vardiyalar da yeni ekibin `teamId` filtresinde görünür; yanıttaki ekip de güncel ekiptir. Bu sorgu geçmiş ekip üyeliği raporu olarak kullanılmamalıdır.

Swagger'da query alanlarına saat farkını doğrudan yazabilirsiniz. URL'yi elle kurarken `+03:00` içindeki `+` işaretini `%2B` olarak kodlayın veya `Z` kullanın; aksi halde `+` boşluk olarak çözümlenebilir.

Yeni entity'ler eklenirken migration terminalden üretilir ve dosya içeriği gözden geçirilir. Mevcut veritabanıyla yalnızca yeni vardiya şemasının farkını oluşturmak için proje kökünde:

```powershell
pnpm --dir workforce-service migration:generate src/migrations/CreateShiftTable
pnpm --dir workforce-service typeorm migration:run -d ./src/data-source.ts
```

Bu üretim komutu ilgili migration henüz yokken geliştirme sırasında bir kez kullanılır. Depodaki migration dosyaları zaten mevcutsa her kurulumda yeniden üretilmez; workforce-service açılışta bekleyen migration'ları uygular. Entegrasyon testleri gerçek migration dosyalarını boş bir Testcontainers veritabanına uygular; `synchronize` kullanılmaz.

## Veritabanını inceleme

DBeaver gibi bir araç için yerel bağlantı bilgileri:

| Ayar | Değer |
| --- | --- |
| Host | localhost |
| Port | 5433 |
| Database | mini_wfm |
| User | postgres |
| Password | mysecretpassword |

Migration'lar çalıştıktan sonra `workforce` şemasında `team`, `workforce_user`, `account` ve `shift` tabloları görünür.

## Durdurma

Uygulama terminallerinde **Ctrl+C** kullanın. PostgreSQL'i durdurmak için proje kökünde:

```powershell
docker compose down
```

Volume silinmediği için veriler korunur.

## Sık karşılaşılan durumlar

| Durum | Kontrol |
| --- | --- |
| API 403 dönüyor | /api/auth/me ile aktif rolü kontrol edin; Swagger Authorize alanında doğru hesabın tokenı olmalı. |
| API 401 dönüyor | Giriş yapın; Swagger Authorize alanındaki tokenı ve geçerlilik süresini kontrol edin. |
| API 503 dönüyor | Workforce service açık mı ve 4001 portunu dinliyor mu? |
| Veritabanına bağlanılamıyor | Docker Desktop, container durumu ve `workforce-service/.env` değerlerini kontrol edin. |
| Kullanıcı/şifre hatası | `.env` ile Compose ayarlarını karşılaştırın. Mevcut volume, ilk oluşturulurken kullanılan veritabanı kullanıcı/şifresini korur. |
| Port kullanımda | Önceki geliştirme süreci veya aynı portu kullanan başka uygulama var mı kontrol edin. |
| Web açılıyor ama veriler gelmiyor | API ve workforce-service açık mı kontrol edin. Vite proxy hedefi varsayılan API portu 3000'dir. |
| Swagger açılmıyor | API terminalindeki başlangıç hatalarını ve API portunu kontrol edin. |
| vite-tsconfig-paths uyarısı | Test sonucundaki hata/başarı bölümünü kontrol edin; bu mesaj tek başına testlerin başarısız olduğunu göstermez. |