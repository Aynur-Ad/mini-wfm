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

Testler ekip adı tekilliğini, arama/sayfalamayı, üyelik/silme kurallarını, kullanıcı hesaplarını ve vardiya çakışmalarını kontrol eder. Vardiyalarda uç uca saatlerin REST ile reddedilmesi, kendini hariç tutan güncelleme, paralel create/update ve personel silme FK kuralı da sınanır. Liste sorgusunda gece vardiyası, aralık sınırları, birlikte filtreleme, güncel ekip sınırlaması ve tek SELECT ile ilişkili verinin yüklenmesi doğrulanır. Toplu atamada tüm çakışan üyeler, pasif üyelerin hariç tutulması, eşzamanlı istekler ve DB hatasında hiçbir kayıt kalmaması da sınanır. Dinlenme, haftalık süre ve ardışık gün kuralları; sınır anları, güncellemede eski kaydın dışlanması, toplu atama ve eşzamanlı dinlenme ihlalleri de sınanır. Migration'ların geri alınıp tekrar uygulanması ayrıca doğrulanır. Unit testlerden farklı olarak repository ve PostgreSQL bağlantısı gerçektir.

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
| İş emri listesi | Evet | Evet | Evet |
| İş emri detayı | Evet | Evet | Evet |
| İş emri oluşturma ve güncelleme | Hayır | Evet | Evet |
| İş emri durum değiştirme | Hayır | Evet | Evet |
| Devam eden iş emrini iptal etme | Hayır | Hayır | Evet |
| İş emri durum geçmişi | Evet | Evet | Evet |

İzinler API controller'larında `@Roles(...)` ile tanımlanır. `JwtGuard` önce token'ı doğrular; ardından `RolesGuard` doğrulanan kullanıcının rolünü kontrol eder. `@Roles` tanımı olmayan endpoint'ler varsayılan olarak yalnızca admin'e açıktır. `@Public()` ile işaretli login ve health bu kontrolden muaftır. Hesap listesi GET olmasına rağmen yalnızca admin'e açıktır; yalnızca HTTP metoduna bakarak izin verilmez.

Swagger'da admin hesabıyla giriş yapıp bir `VIEWER` ve bir `PLANNER` hesabı oluşturun. Her hesap için login'den token alın; Authorize içindeki önceki token'ı değiştirin. Viewer ekip listesini okuyabilmeli, ekip oluştururken `403` almalıdır. Planner da ekip/personel kayıtlarını okuyabilir; bunları değiştiremez ve hesap listesini göremez. Admin tüm mevcut işlemleri kullanabilir. Swagger endpoint açıklamaları izin verilen rolleri gösterir.

Butonları arayüzde gizlemek doğrudan HTTP isteği gönderilmesini engellemez. İzin kontrolü backend'de yapılır ve yetkisiz istek workforce-service'e iletilmez. Rapor endpoint'leri eklendiğinde kendi izinleri ayrıca tanımlanacaktır.

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

Aynı personelin aralıkları `mevcut.startAt < yeni.endAt && mevcut.endAt > yeni.startAt` ise çakışır. Örneğin 08:00–16:00 ile 12:00–20:00 çakışır; 16:00–22:00 aralık olarak çakışmaz, ancak yeni atamada 11 saat dinlenme kuralına aykırı olduğu için REST hatasıyla reddedilir. Çakışma yanıtı `409` ve çakışan vardiyanın UTC saatlerini içerir. Kendi saatleriyle güncellemede aynı vardiya çakışma sayılmaz. Personel satırı transaction içinde kilitlenerek eşzamanlı API yazmalarının kontrolü atlaması önlenir.

Vardiyası olan personel, vardiya geçmişte olsa da silinemez (`409`). Foreign key doğrudan SQL ile silmeyi de engeller. Takvim arayüzü henüz eklenmemiştir; kontroller Swagger'daki **Shifts** bölümünden yapılır.

### Dinlenme ve çalışma sınırları

Vardiya oluşturma, güncelleme ve ekibe toplu atamada şu kurallar uygulanır. Çakışma ve mevcut 1–12 saat/geçmiş tarih kuralları da geçerlidir.

| Kod | Varsayılan kural | Sınır örneği |
| --- | --- | --- |
| REST | Ardışık iki vardiya arasında en az 11 saat dinlenme | Tam 11 saat kabul edilir; 6 saat reddedilir. |
| WEEKLY_LIMIT | Yerel pazartesi 00:00'dan sonraki pazartesi 00:00'a en fazla 60 saat | Tam 60 kabul edilir; 66 reddedilir. |
| CONSECUTIVE_DAYS | En fazla 6 yerel gün üst üste çalışma | 7 gün reddedilir; boş gün seriyi keser. |

Hesaplar `common/calc/interval.ts` ve `shifts/calc/work-rules.ts` içindeki saf fonksiyonlardadır. NestJS, TypeORM veya tarih kütüphanesine bağlı değildir; verilen diziler ve Date nesneleri değiştirilmez. Vardiyalar personel bazında gruplanıp bir kopya üzerinde sıralanır. Yalnız aday vardiyaların etkilediği çiftler, haftalar ve gün serileri raporlanır; uzak/eski bir ihlal ilgisiz atamayı engellemez. REST'in for referans çözümü ve servis tarafından kullanılan dizi çözümü aynı tablo örnekleriyle karşılaştırılır. İkisi de aynı karmaşıklıktadır; dizi sürümü sonuç birleştirmeyi kısaltır, for sürümü ardışık eleman karşılaştırmasını adım adım okumayı kolaylaştırır.

Vardiyalar `[startAt, endAt)` kabul edilir. Gece yarısını geçen vardiya iki güne dokunur; tam gece yarısında biten vardiya ertesi günü çalışılmış saymaz. Aynı günün birden fazla vardiyası gün sayısını artırmaz. Pazar 22:00–Pazartesi 06:00 vardiyası önceki haftaya 2, sonraki haftaya 6 saat yazar. Gün/hafta sınırları işletim sisteminin saat diliminden bağımsız, ayardaki sabit UTC farkıyla hesaplanır. Türkiye için UTC+3 kullanılır; yaz saati değişen bölgeleri bu sabit fark modeli desteklemez.

Süre hesabı dakika cinsindendir; normal dakika hassasiyetindeki girdiler tam dakika üretir. Mevcut ISO tarih sözleşmesinin kabul ettiği saniyeli girdilerde süre aşağı yuvarlanmaz: kesirli dakika korunur, böylece 11 saatten 1 saniye eksik dinlenme yanlışlıkla kabul edilmez. Saat dönüşümü ve 1 ondalık yuvarlama yalnız hata yanıtını oluştururken yapılır; kararlar yuvarlanmamış değere dayanır. `actualMinutes` ve `limitMinutes` ham süreyi de taşır.

İhlalde `409`, `Vardiya çalışma kurallarına uymuyor` mesajı ve `details` listesi döner. Her detay `code`, `workforceUserId`, ilgili mevcut/yeni vardiyaların ID ve UTC saatleri, `value`, `limit`, `unit` ve Türkçe mesaj içerir. Süreler yanıtta saat, gün serileri gün cinsindedir. Haftalık ihlalde `weekStart`, ardışık gün ihlalinde `fromDate`/`toDate` yerel tarihleri bulunur. Toplu atamada ad, soyad ve sicil de eklenir; bir üye ihlal ediyorsa hiçbir üyeye kayıt yapılmaz.

Service, aday başlangıcının 7 gün öncesi ile aday bitişinin 7 gün sonrası arasında kesişen vardiyaları okur. Güncellemede eski vardiya ID'si hem çakışma hem çalışma kuralı sorgusundan çıkarılır. Ekip atamasında bütün üyelerin gerekli kayıtları tek sorguda okunur. Kontrol ve kayıt aynı transaction içindedir; personel kilitleri eşzamanlı tekil/toplu isteklerin kontrolü aşmasını engeller. Bu uygulama kuralları doğrudan SQL yazımlarını kapsamaz; çapraz vardiya sınırları bir veritabanı CHECK kısıtı değildir.

Aşağıdaki ayarlar workforce-service açılırken doğrulanır; `.env` içinde yoksa varsayılanlar kullanılır. Yeni ayar için mevcut migration'lar değiştirilmez.

| Ayar | Varsayılan | Geçerli aralık |
| --- | --- | --- |
| TIMEZONE_OFFSET_MINUTES | 180 | -840–840 tam sayı dakika |
| MIN_REST_HOURS | 11 | 1–24 tam sayı saat |
| MAX_WEEKLY_HOURS | 60 | 1–168 tam sayı saat |
| MAX_CONSECUTIVE_DAYS | 6 | 1–6 tam sayı gün |

Ardışık gün ayarının üst sınırı, 7 günlük kontrol penceresinin kuralı güvenle saptamasını korur. Hesap fonksiyonu saat farkı ve limitleri options üzerinden alır; servis doğrulanmış ConfigService değerlerini bu options'a aktarır.

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

Swagger'da üç aktif üyeli bir ekip oluşturun. Bir üyeye tekil vardiya ekleyip aynı saatlere toplu atamayı deneyin: `409` ve ilgili personelin adı/sicili dönmeli. `GET /api/shifts` veya DBeaver'dan diğer üyelere hiçbir yeni kayıt yazılmadığını doğrulayın. Çakışmayan ve çalışma kurallarına uyan saatlerle deneyince aktif üye sayısı kadar vardiya ve `201` beklenir. Pasif üyeye vardiya eklenmemelidir.

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

## İş emirleri

İş emri bir ekibin yapacağı işi, önceliğini ve son tarihini temsil eder. `workforce.work_order` tablosunda tutulur. Oluşturulurken durum `OPEN`, ekip `null`, öncelik gönderilmezse `MEDIUM` olur. `createdById` doğrulanmış actor'dan alınır; istemci kod, durum, ekip veya oluşturan hesabı seçemez.

| İşlem | Endpoint | Roller | Başarı |
| --- | --- | --- | --- |
| Liste | GET `/api/work-orders` | ADMIN, PLANNER, VIEWER | 200; `{ data, total, page, limit }` |
| Oluşturma | POST `/api/work-orders` | ADMIN, PLANNER | 201 |
| Detay | GET `/api/work-orders/:id` | ADMIN, PLANNER, VIEWER | 200 |
| Kısmi güncelleme | PATCH `/api/work-orders/:id` | ADMIN, PLANNER | 200 |
| Durum değiştirme | PATCH `/api/work-orders/:id/status` | ADMIN, PLANNER; devam eden işi iptal yalnız ADMIN | 200 |
| Durum geçmişi | GET `/api/work-orders/:id/history` | ADMIN, PLANNER, VIEWER | 200; dizi |

Başlık zorunludur, kırpılır ve en fazla 200 karakter olabilir. Açıklama opsiyoneldir, `null` ile temizlenebilir. Öncelik `LOW`, `MEDIUM`, `HIGH`, `URGENT` değerlerinden biridir. `dueAt` saat dilimi belirtilmiş ISO 8601 olmalı ve oluşturma/gönderilen yeni son tarihte geçmişte olmamalıdır (`400`). Tarihler UTC `Z` biçiminde döner.

Kod `IE-2026-00001` biçimindedir. PostgreSQL'in `SERIAL` ID alanı için oluşturduğu sequence'ten `nextval` alınır ve aynı sayı ID ile kodda kullanılır. Paralel isteklerde `MAX(id)+1` hesabı yapılmaz. Sayı en az beş hanelidir; 99999 sonrasında kırpılmaz ve yıl değişiminde sıfırlanmaz. Kodun yıl bölümü sunucunun yerel ayarından bağımsız olarak UTC yılıdır. Sequence rollback ile geri alınmaz; hata sonrası numara boşlukları normaldir, aralıksız numaralandırma vaat edilmez.

PATCH yalnızca `title`, `description`, `priority`, `dueAt` alanlarını kabul eder. Gönderilen `status`, `teamId`, `code` ve `createdById` alanları whitelist tarafından kaldırılır; servis de yalnız izinli alanları uygular. `COMPLETED` veya `CANCELLED` iş emri güncellenemez (`409`). Durum ve ekip ataması ayrı `/status` ucu üzerinden yapılır. `version` alanı 1'den başlar; iki PATCH ucunda zorunludur ve son okunan değerle gönderilir. Her başarılı güncellemede sunucu tarafından tam bir artırılır; eski sürüm `409` döner.

İş emri silme endpoint'i yoktur; geçmiş korunur. Açık iş emrine bağlı ekip üyesiz olsa da silinemez (`409`). B12 gereği kapanmış bağlı iş emri geçmişi de RESTRICT foreign key ile korunur; böyle bir ekipte de `409` döner.

Geliştirme sırasında yeni iş emri migration'ını bir kez terminalden üretip inceleyin:

```powershell
pnpm --dir workforce-service migration:generate src/migrations/CreateWorkOrderTable
pnpm --dir workforce-service typeorm migration:run -d ./src/data-source.ts
```

`id SERIAL` tanımı sequence'i otomatik oluşturur; ayrıca elle CREATE SEQUENCE eklemek gerekmez. Migration dosyası depoda zaten varsa yeniden üretilmez. Swagger **WorkOrders** bölümünden başlık, gelecek bir son tarih ve opsiyonel açıklama/öncelikle deneyebilirsiniz.

### Listeleme ve filtreler

`GET /api/work-orders` sayfalı `{ data, total, page, limit }` yanıtı döndürür. `page` en az 1, `limit` 1–100 arasıdır; varsayılanlar 1 ve 10'dur. `total` filtreye uyan tüm kayıtları sayar; son sayfanın ötesinde `data: []` döner. Liste her üç role açıktır.

| Parametre | Davranış |
| --- | --- |
| `search` | Kod veya başlıkta büyük/küçük harf duyarsız arama; baş/son boşluklar kırpılır, boş metin filtre uygulamaz. `%`, `_` ve `\` gerçek karakter olarak aranır. |
| `status` | Tek veya tekrar eden parametre: `status=OPEN&status=ASSIGNED`. Seçilen durumlardan herhangi biri eşleşebilir. |
| `priority`, `teamId` | Tek öncelik ve pozitif ekip ID filtresi. |
| `overdue` | `true`: yalnız son tarihi geçmiş ve kapanmamış iş emirleri. `false` veya gönderilmemesi ek filtre uygulamaz. |
| `sortBy` | Yalnız `createdAt`, `dueAt`, `priority`; varsayılan `createdAt`. |
| `sortOrder` | `asc` veya `desc`; varsayılan `desc`. |

Farklı filtreler AND ile birleşir; arama kendi içinde kod/başlık OR, çoklu durum kendi içinde OR kullanır. Öncelik sırası `LOW < MEDIUM < HIGH < URGENT` olarak açık CASE ifadesiyle belirlenir; `desc` en acili başa getirir. Eşit sıralama değerlerinde ID aynı yönde ikinci anahtardır; sayfalama kararlı kalır. SQL sıralaması sabit beyaz listeden seçilir; geçersiz alan/yön `400` döner.

Her listede `team: { id, name }` veya `null` ve SQL'de hesaplanan `isOverdue` alanı bulunur. Atanmamış iş emirleri LEFT JOIN sayesinde listede kalır. `dueAt` sorgunun referans anından küçükse ve durum `COMPLETED`/`CANCELLED` değilse gecikmiştir. Tam eşit anda gecikmiş sayılmaz; kapanmış kayıtlarda her zaman `false` döner. Bu alan veritabanına kaydedilmez ve şema değişikliği gerektirmez.

Örnek: `/api/work-orders?page=1&limit=10&status=OPEN&status=ASSIGNED&priority=HIGH&teamId=3&overdue=true&sortBy=priority&sortOrder=desc`.

### Eşzamanlı güncelleme koruması

`PATCH /api/work-orders/:id` ve `PATCH /api/work-orders/:id/status` gövdesinde son GET/liste yanıtından alınan pozitif tam sayı `version` zorunludur. Eksik, null, string veya geçersiz sayı `400` döner. Örneğin `{ "title": "Yeni başlık", "version": 1 }` ve `{ "status": "ASSIGNED", "teamId": 3, "version": 2 }`. Oluşturmada sürüm istemciden alınmaz; ilk sürüm 1'dir.

Entity zaten `@VersionColumn` kullanır. Bunun tek başına eski istemci verisini reddedeceği varsayılmaz. Worker, izin verilen alanlarla bir UPDATE kurar ve `WHERE id = :id AND version = :version` koşulunu aynı sorguya ekler. Sürüm aynı SQL içinde `version + 1` yapılır. Güncel durum iş kuralları için önceden okunur; bu okuma sonrasında başka bir istek araya girerse korumayı SQL koşulu sağlar. Koşula uyan satır yoksa `409` ve **Kayıt siz düzenlerken değişti, sayfayı yenileyin** döner. Kayıt baştan yoksa `404` döner. ID ve sürüm SQL parametreleridir.

Yanıtta yeni sürüm bulunur; bir sonraki istekte bu sürüm gönderilmelidir. İki istek aynı sürümle yarışırsa yalnız biri kazanır; PATCH ve durum değiştirme uçları da aynı sürümü paylaşır. Geçerli sürümle yalnız version gönderilen bir PATCH de başarılı güncelleme sayılır ve sürümü bir artırır. Durum geçişiyle geçmiş INSERT'i aynı transaction'dadır: geçmiş yazılamazsa yeni durum, ekip ve sürüm geri alınır; başarısız çakışma geçmiş eklemez.

"Önce oku, sonra kontrol et, sonra yaz" tek başına yetmez: iki istek sürüm 1'i aynı anda okuyup kontrolü geçebilir. SQL'deki sürüm koşulu ilk yazımdan sonra ikinci isteğin sürüm 1'i değiştirmesini engeller. PostgreSQL UPDATE nedeniyle bekleyen isteğin koşulunu güncel satır üzerinde tekrar değerlendirir. Bu amaçla iş emrini önceden `FOR UPDATE` ile kilitlemek yerine koşullu güncelleme kullanılır; ekip/üye iş kuralları için gereken kilitler atamada korunur.

### Durum geçişleri ve geçmiş

Durum değiştirme gövdesi zorunlu `version`, `status`, opsiyonel `teamId` ve opsiyonel `reason` alır. İptalde neden zorunludur, kırpıldıktan sonra boş olamaz ve en fazla 500 karakterdir. Atamada ekip ID zorunludur; diğer hedeflere gönderilen ekip ID durumun kendi kuralını değiştirmez.

| Mevcut durum | Hedef | Ek kural |
| --- | --- | --- |
| OPEN | ASSIGNED | Ekip aktif ve en az bir aktif üyeli olmalı |
| OPEN | CANCELLED | reason zorunlu |
| ASSIGNED | IN_PROGRESS | Ekip korunur |
| ASSIGNED | OPEN | Atama geri alınır; teamId null olur |
| ASSIGNED | CANCELLED | reason zorunlu; ekip korunur |
| IN_PROGRESS | COMPLETED | Ekip korunur |
| IN_PROGRESS | CANCELLED | reason zorunlu; yalnız ADMIN |

Diğer tüm geçişler `409` ve Türkçe durum adlarıyla açıklama döndürür. Kurallar worker'da `work-orders/rules/status-transitions.ts` dosyasındadır. State'e bağlı rol kontrolü API'de yapılır. API'nin kontrol ettiği durum transaction içinde tekrar karşılaştırılır; arada durum değiştiyse işlem `409` ile durur. Bu dahili `expectedStatus` istemciden alınmaz; durum değişikliğinde SQL koşuluna da eklenir. İstemcinin `version` değeri ayrıca iki güncelleme ucunda atomik olarak kontrol edilir.

İş emrini oluşturma da ilk geçmiş satırını `fromStatus: null`, `toStatus: OPEN` olarak ekler. Sonraki değişiklikler `workforce.work_order_status_history` tablosuna önceki/yeni durum, işlem sonrası ekip, neden, değiştiren hesap ve zamanla yazılır. İş emri güncellemesi ve geçmiş ekleme tek transaction'dadır; geçmiş yazılamazsa durum/version/ekip de geri alınır. İlk geçmiş yazılamazsa iş emri oluşturma da geri alınır.

Geçmiş ucu `changedAt ASC`, eşitlikte `id ASC` sırasıyla dizi döndürür. `changedBy` özeti yalnız `id` ve `username` içerir. Tarihler UTC Z biçimindedir. Bu özellik eklenmeden önce var olan iş emirleri için geriye dönük hayali geçmiş oluşturulmaz; yeni iş emirlerinde ilk satır, eski kayıtlarda bu aşamadan sonraki değişiklikler kaydedilir.

**Ekip aktifliği/üyelik kararı — mentor teyidi bekliyor:** Aktif ekip ve aktif üye kontrolü atama anında yapılır. Sonradan ekip pasifleştirilirse veya üyeleri ayrılırsa iş emrinin durumu otomatik değiştirilmez; mevcut iş emri başlatılabilir, tamamlanabilir veya izinli şekilde iptal edilebilir. Bu başlangıç kararı mentorla görüşülerek kesinleştirilmelidir; henüz mentor tarafından onaylandığı varsayılmaz. Açık iş emrinin ekip silme koruması sürer. Atama geri alınmış olsa bile geçmişte ekibe referans varsa B12 ve RESTRICT nedeniyle ekip silinemez (`409`).

Yeni geçmiş entity'sinin migration'ını geliştirme sırasında bir kez terminalden üretip inceleyin:

```powershell
pnpm --dir workforce-service migration:generate src/migrations/CreateWorkOrderStatusHistory
pnpm --dir workforce-service typeorm migration:run -d ./src/data-source.ts
```

Bu migration yeni geçmiş tablosu, üç foreign key ve iş emri/zaman indeksini içerir. Önceki iş emri veya hesap enumlarının değiştirilmesi bu işin kapsamı değildir.

## Veritabanını inceleme

DBeaver gibi bir araç için yerel bağlantı bilgileri:

| Ayar | Değer |
| --- | --- |
| Host | localhost |
| Port | 5433 |
| Database | mini_wfm |
| User | postgres |
| Password | mysecretpassword |

Migration'lar çalıştıktan sonra `workforce` şemasında `team`, `workforce_user`, `account`, `shift`, `work_order` ve `work_order_status_history` tabloları görünür.

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
### Aylık puantaj

GET `/api/workforce-users/:id/timesheet?month=2026-11` üç role açıktır. 2026–2027 takvimi desteklenir; diğer yıllar sessizce tatilsiz hesaplanmaz, 400 döner. Günlük satırlar boş günler dahil toplam/gece/tatil/hafta sonu/fazla mesai saatlerini ve ay toplamlarını içerir. Haftalık `total`/`overtime` tam haftaya, `monthTotal`/`monthOvertime` ay içine aittir. Gece 20–06, yarım tatil 13:00 sonrası, fazla mesai haftalık 45 saat sonrasıdır. Tatil hafta sonuna önceliklidir; gece ve fazla mesai diğer kategorilerle kesişebilir. Servis ayın dokunduğu tam haftaları okur. Hesaplar dakika cinsindedir; saat ve 1 ondalık dönüşüm yalnız yanıt sınırında yapılır. Sabit UTC farkı ayardan gelir; yaz saati desteklenmez.

Üretim `shifts/calc/timesheet.ts` sınır bölme algoritmasını kullanır. Dakika referansı yalnız `src/test/timesheet.reference.ts` içindedir ve üretim build'ine dahil değildir. 200 sabit seed'li ayda sonuçlar karşılaştırılır. Ölçüm: `pnpm --dir workforce-service exec node --import tsx scripts/benchmark-timesheet.ts`. 1000 personel × 22 vardiya × bir ay ölçümünde bu ortamda referans 7171.07 ms, bölme 111.65 ms; donanım/yük sonucu etkiler.

Tatil kaynakları: [Borsa İstanbul 2026](https://www.borsaistanbul.com/resmi-tatil-gunleri), [Diyanet](https://diyanet.gov.tr/dini-gun-geceler), [DHMİ 2027](https://dhmi.gov.tr/AIPDocuments/LT_GEN_2_1_en.pdf). İdari izinler resmi tatil sayılmaz; 2027-05-19 bir kez sayılır.

### Otomatik rotasyon

POST `/api/teams/:id/rotation-plan` ADMIN/PLANNER için 200 yanıtıyla plan döndürür. Gövde `startDate` (yerel YYYY-MM-DD), `days` (1–14), `slots: [{ name, startTime, endTime, requiredCount }]` ve `apply` (varsayılan false) alır. Bitişte 24:00 desteklenir; gece yarısını aşan kalıp ertesi gün biter. Süre 1–12 saat olmalıdır; kalıp adları benzersizdir.

Algoritma günleri ve gün içi kalıpları başlangıca göre dolaşır. Aktif üyelerde çakışma ve çalışma kuralları kontrol edilir. Adaylar yalnız plana eklenen dakika, eşitlikte sicil ve ID ile sıralanır. Yanıtta assignments, tüm üyeler için totals (dakika/saat), unfilled ve fairnessHours vardır. Bu greedy yöntem küresel optimum vaat etmez. Kalıpları yanlışlıkla Sabah/Akşam/Gece dolaşmak 4 veya 5 üyede yedinci Gece'yi boş bırakabilir; testte sıralama kapalı karşılaştırma bulunur.

Önizleme yazmaz. apply=true eksik planda `409 Plan tamamlanamadı` ve unfilled detayları verir. Tam planda ekip/personel kilitleri, mevcut vardiya okuması, hesap ve toplu save tek transaction'dadır. Başlangıcı geçmiş atama kaydedilmez; önizleme geçmiş tarih için de hesap yapabilir. Aynı planın tekrar uygulanması mevcut vardiyalarla değerlendirilir; eksik plan oluşursa 409 olur.

### İş emri için ekip önerisi

GET `/api/work-orders/:id/team-suggestions` üç role açıktır; yalnız OPEN durumda çalışır (aksi 409). Şimdi ile dueAt arasındaki aktif üye vardiya saatleri kapasitedir. Puan = kapasite × 2 − açık iş sayısı × 5 − geciken açık iş sayısı × 10. URGENT için kapasite katsayısı 4 olur. Açık yük yalnız ASSIGNED/IN_PROGRESS sayar. Tek ağırlık nesnesi `work-orders/calc/team-score.ts` içindedir.

Aktif ama kapasitesiz ekip excluded/NO_CAPACITY listesine gider. Diğerlerinden puan azalan, açık yük artan, ad ve ID artan sıralamayla ilk üç döner. Her önerinin breakdown puanları toplamı score değeridir. DueAt geçmişse değerlendirme kapasitesi sıfırdır. Pasif ekip/üye sayılmaz.

Servis hedef iş emri, aktif ekip+üyeler (LEFT JOIN), ilgili vardiyalar ve açık yükü en fazla dört SELECT ile okur. Saf fonksiyon personel-ekip ve ekip-metrik Map'leri kurar, vardiyaları/işleri birer kez dolaşır: O(T + M + S + W + T log T). Ekip başına bütün vardiyaları tekrar taramak O(T × S) olurdu. 50 ekip/1000 personel/10000 vardiya için 50 ms sınırını test eder; ayrı ölçüm `pnpm --dir workforce-service exec node --import tsx scripts/benchmark-team-score.ts`. Öneri bir atama garantisi veya çalışma kuralı kontrolü değildir; karar destek puanıdır.


## MWFM-39 — Mevcut çalışmaya uygulanan düzeltmeler

Bu bölüm, 17 Kasım'da gönderilen `chat(1).zip` içindeki kod esas alınarak hazırlanmıştır. Önceki ZIP ile karıştırmayın. `work_order_events` kuyruğu, `local_dev_only` yerel RabbitMQ şifresi, `findNotifications` TCP mesaj adı ve mevcut NotificationsModule yapısı korundu.

### Uygulama sırası (PowerShell, proje kökü)

1. Bu düzeltme ZIP'inin içeriğini doğrudan proje köküne kopyalayın ve aynı adlı dosyaları değiştirin. ZIP'te gerçek `.env`, `node_modules` veya veritabanı verisi yoktur.
2. Aşağıdaki üç dosya, gönderilen ZIP'te kökteki dosyalarla birebir aynıydı. Bunlar yanlışlıkla `test` klasörlerine kopyalanmış; asıl dosyalar yerinde duruyor. Yalnız bu üç kopyayı kaldırın:

```powershell
Remove-Item -LiteralPath "api/test/.env.example", "workforce-service/test/.env.example", "workforce-service/test/package.json"
```

`test` klasörlerini veya diğer test dosyalarını silmeyin. Kök `pnpm-lock.yaml` bu düzeltmede değiştirilmedi; uygulamaların bağımlılıklarını kendi klasörlerinden kurun.

3. Bağımlılıkları kurun:

```powershell
pnpm --dir api install --frozen-lockfile
pnpm --dir workforce-service install --frozen-lockfile
pnpm --dir notification-service install --frozen-lockfile
```

Yeni notification-service kilit dosyası ve `pnpm-workspace.yaml`, kurulumun tekrarlanabilir olması ve gerekli esbuild kurulum betiğinin çalışması için eklendi. Testcontainers'ın bu projede kullanılmayan SSH/Protobuf yardımcı derlemeleri açıkça kapatıldı.

4. Gerçek `.env` dosyalarınızı koruyun. Notification-service için henüz `.env` yoksa `.env.example` dosyasını kopyalayın ve `DB_PASSWORD` değerini mevcut PostgreSQL şifrenizle doldurun. API ve workforce-service'in `.env` dosyalarını yeniden kopyalayarak üzerlerine yazmayın.

Kontrol edilecek değerler:

| Uygulama | Değerler |
| --- | --- |
| api | `NOTIFICATION_HOST=127.0.0.1`, `NOTIFICATION_PORT=4002` |
| workforce-service | `RABBITMQ_URL=amqp://mini_wfm:local_dev_only@127.0.0.1:5672`, `RABBITMQ_QUEUE=work_order_events`, `EVENT_PUBLISH_TIMEOUT_MS=1500` |
| notification-service | Aynı `RABBITMQ_URL` ve `RABBITMQ_QUEUE`; `NOTIFICATION_HOST=127.0.0.1`, `NOTIFICATION_PORT=4002`; mevcut PostgreSQL bağlantısı |

Kuyruk ve timeout için kodda yukarıdaki varsayılanlar vardır. RabbitMQ şifresini kendiniz değiştirdiyseniz URL'lerde kendi değerinizi kullanın. İki servisin kuyruk adı aynı olmalıdır.

5. Docker Desktop açıkken altyapıyı başlatın; ardından üç backend uygulamasını ayrı terminallerde çalıştırın:

```powershell
docker compose up -d
```

Ayrı terminaller:

```powershell
pnpm --dir workforce-service start:dev
```

```powershell
pnpm --dir notification-service start:dev
```

```powershell
pnpm --dir api start:dev
```

Açık eski süreçler varsa önce durdurup yeniden başlatın. Notification-service HTTP açmaz; RabbitMQ'dan olay, TCP 4002'den okuma isteği alır.

### Neyi, neden düzelttim?

| Dosya/klasör | Değişiklik ve nedeni |
| --- | --- |
| `workforce-service/src/work-orders/events/work-order-events.publisher.ts` | Sınırsız açık kalan subscribe yerine süre sınırlı yayın ve her deneme sonunda kapanan istemci var. Broker onayı beklenir, tüketicinin işi bitirmesi beklenmez. Hata atamayı bozmaz; ham bağlantı hataları/şifreler loglanmaz. |
| `workforce-service/src/work-orders/work-orders.service.ts` | Senin COMMIT sonrası yayın akışın korundu. İki yayının en fazla ayardaki süre kadar beklenip temizlenmesi sağlandı. COMMIT hatasında yayın başlamıyor. |
| `workforce-service/src/work-orders/work-orders.module.ts` | Yayıncı kendi kısa ömürlü istemcisini kullandığı için eski sürekli RMQ client kaydı çıkarıldı. |
| `notification-service/src/notifications/notifications.controller.ts` | DB hatasında `nack(..., requeue=true)` var; mesaj açık kanal üzerinde yeniden denenebilir. Geçersiz mesajlar sonsuz kez denenmez. Başarılı COMMIT veya daha önce işlenmiş olay sonrasında ack yapılır. Event handler'ları yalnız RMQ, okuma handler'ı yalnız TCP için tanımlandı. |
| `notification-service/src/notifications/notifications.service.ts` | İşlenmiş olay işaretçisi ve tüm alıcıların bildirimleri aynı transaction'da yazılıyor. Paralel aynı olaylar tekil işaretçi ile engelleniyor. Okuma P2 biçiminde sayfalı hale getirildi. |
| `notification-service/src/common/logging/` | Mevcut projenin güvenli logger yaklaşımı bu servise de eklendi. Olay ve TCP okumasında correlation id bütün işlem boyunca korunuyor. |
| `notification-service/src/config/`, `src/data-source.ts`, `src/migrations/` | Bildirim servisinin migration geçmişi `public.notification_migrations` olarak ayrıldı. Önceden oluşturulmuş bildirimler korunuyor; eski tablo güvenle tanınıyor, işlenmiş olaylar yeni tabloya aktarılıyor. Yanlışlıkla `public.migrations` içine yazılmış yalnız `CreateNotification1794800000000` kaydı kaldırılıyor; workforce migration kayıtları korunuyor. |
| `notification-service/src/notifications/notification.entity.ts` | Entity'deki indeks tanımı, mevcut migration'daki personel+tarih indeksiyle eşleştirildi. |
| `api/src/notifications/` | Pozitif personel ID doğrulaması, sayfalama, yanıt tipleri ve Swagger eklendi. Correlation id TCP zarfında taşınıyor. 3 saniyelik zaman aşımı HTTP 503 oluyor. API'deki mevcut ikinci TCP bağlantın korundu. |
| Ayarlar, kilit dosyası ve testler | Kuyruk/timeout doğrulandı; tekrar teslim, ACK/NACK, COMMIT/rollback, eski veriyi koruyan migration geçişi ve gerçek TCP testi eklendi. |

`eventId` kaynak olayda `processed_event` tablosunun birincil anahtarıyla tekildir. Bir kaynak olay birden fazla üyeye bildirim oluşturduğu için, bildirim tablosundaki mevcut `(event_id, workforce_user_id)` tekil kuralın korundu. Böylece her üye bir bildirim alır ve tekrar teslim yeni kayıt oluşturmaz.

İlk notification migration'ında yalnız `IF NOT EXISTS` eklenmesi, daha önce başlatılmış bu proje kopyasının tabloyu silmeden ayrı migration geçmişine geçebilmesi içindir. Yeni işlenen olay tablosu ayrı migration'dadır. Manuel tablo/volume silme gerekmiyor.

### Kontroller

Hazırlama ortamında 944 test geçti: API 574, workforce-service 349, notification-service 21. Üç uygulamanın build ve lint kontrolleri geçti. Kapalı AMQP portuyla zaman aşımı ve gerçek TCP okuması da test edildi. PostgreSQL entegrasyon testleri eklendi fakat bu ortamda Docker/container runtime bulunmadığı için çalıştırılamadı.

Kendi bilgisayarınızda:

```powershell
pnpm --dir api test
pnpm --dir workforce-service test
pnpm --dir notification-service test
pnpm --dir api build
pnpm --dir workforce-service build
pnpm --dir notification-service build
pnpm --dir api lint
pnpm --dir workforce-service lint
pnpm --dir notification-service lint
```

Docker Desktop açıkken:

```powershell
pnpm --dir workforce-service test:int
pnpm --dir notification-service test:int
```

Bildirim entegrasyon testleri geçici PostgreSQL kullanır; geliştirme veritabanına bağlanmaz. Aynı olayın paralel gelmesi, transaction rollback, eski migration geçmişinden geçiş ve eski bildirimlerin korunması test edilir.

Elle uçtan uca kontrol:

1. Swagger'da giriş yapın; aktif ve en az iki aktif üyeli ekip hazırlayın.
2. Notification-service'i durdurun. OPEN bir iş emrini bu ekibe atayın. RabbitMQ yönetim ekranında http://localhost:15672 adresinde `work_order_events` kuyruğundaki durum ve atama mesajlarını görün. Yerel kullanıcı `mini_wfm`, şifre `local_dev_only`.
3. Notification-service'i başlatın; kuyruk işlenmeli. Her aktif üye için `GET /api/notifications?workforceUserId=<id>&page=1&limit=10` çağırın. Yanıt `{data,total,page,limit}` biçimindedir. Pasif üye için yeni bildirim oluşmaz.
4. İsteğin correlation id değerini workforce-service ve notification-service loglarında takip edin.
5. `docker compose stop rabbitmq` yapıp başka bir OPEN iş emrini atayın. Atama başarılı kalmalı; hata workforce-service loguna yazılmalı. Sonra `docker compose start rabbitmq` ile broker'ı açın.
6. Yanlış version ile bir durum değişikliği isteyin. 409 dönmeli ve yeni olay/bildirim oluşmamalı.

`send` + `@MessagePattern` yanıt beklenen TCP okumasıdır; `emit` + `@EventPattern` olmuş bir işin RabbitMQ üzerinden duyurulmasıdır. Tüketici kapalıyken broker'a ulaşan mesaj kalıcı kuyrukta bekler. B23 gereği broker'a ulaştırılamayan olay kaybolabilir; COMMIT ile yayın arasındaki süreç çökmesi de kayba yol açabilir. Outbox bu task'ın kapsamında değildir.

### Branch, commit ve push

Branch adı: `feature/MWFM-39-notification-service`. Zaten bu branch'teyseniz yeniden oluşturmayın. Değişiklikleriniz varken sırf branch açmak için `development` dalına geçmeniz gerekmez. Mevcut task-39 çalışmanızı yeni bir branch'e ayırmanız gerekiyorsa ve bu ad henüz yoksa:

```powershell
git switch -c feature/MWFM-39-notification-service
```

Dosyaları uygulayıp kontrolleri yaptıktan sonra:

```powershell
git status --short
git add README.md docker-compose.yaml api workforce-service notification-service
git commit -m "MWFM-39: RabbitMQ bildirim akışını tamamla"
git push -u origin feature/MWFM-39-notification-service
```

PR hedefi proje planındaki `development` branch'i olsun.

PR başlığı:

```text
MWFM-39: RabbitMQ ve notification-service ile atama bildirimleri
```

PR açıklaması:

```text
İş emri durum değişikliklerinin COMMIT sonrasında RabbitMQ üzerinden yayınlanması ve atanan ekibin aktif üyeleri için bildirim oluşturulması eklendi. Bildirimler API üzerinden notification-service'e yapılan TCP çağrısıyla okunuyor.

- Kalıcı kuyruk, manuel ACK/NACK ve tekrar teslim koruması eklendi.
- Broker hatasının iş emri atamasını bozmaması sağlandı.
- Correlation id, ayar doğrulaması ve bağımsız migration geçmişi tamamlandı.
- Yanlışlıkla test klasörlerine kopyalanmış üç ayar dosyası temizlendi.

Doğrulama: Hazırlama ortamında 944 test ile üç uygulamanın build/lint kontrolleri geçti. Docker gerektiren entegrasyon testleri bu ortamda çalıştırılamadı; yerel sonuçlar ayrıca eklenmeli.

B23 gereği broker'a ulaştırılamayan olay kaybolabilir; outbox kapsam dışıdır.
```
