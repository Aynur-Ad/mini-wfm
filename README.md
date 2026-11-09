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
```

Bu değerler depodaki **yerel geliştirme** Compose ayarlarıdır. Compose kullanıcı veya şifresini değiştirdiyseniz `.env` değerlerini de eşleştirin. `.env` Git'e eklenmez; `.env.example` depoda kalır.

API veritabanına bağlanmaz. `api/.env`, PORT=3000, WORKFORCE_HOST=127.0.0.1 ve WORKFORCE_PORT=4001 ayarlarını içerir. API hedef portu ile servisin dinlediği port eşleşmelidir.

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

## Swagger üzerinden ilk kontrol

Swagger'da endpoint'i açıp **Try it out → Execute** ile istek gönderin.

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

## Veritabanını inceleme

DBeaver gibi bir araç için yerel bağlantı bilgileri:

| Ayar | Değer |
| --- | --- |
| Host | localhost |
| Port | 5433 |
| Database | mini_wfm |
| User | postgres |
| Password | mysecretpassword |

Migration'lar çalıştıktan sonra `workforce` şemasında `team` ve `workforce_user` tabloları görünür.

## Durdurma

Uygulama terminallerinde **Ctrl+C** kullanın. PostgreSQL'i durdurmak için proje kökünde:

```powershell
docker compose down
```

Volume silinmediği için veriler korunur.

## Sık karşılaşılan durumlar

| Durum | Kontrol |
| --- | --- |
| API 503 dönüyor | Workforce service açık mı ve 4001 portunu dinliyor mu? |
| Veritabanına bağlanılamıyor | Docker Desktop, container durumu ve `workforce-service/.env` değerlerini kontrol edin. |
| Kullanıcı/şifre hatası | `.env` ile Compose ayarlarını karşılaştırın. Mevcut volume, ilk oluşturulurken kullanılan veritabanı kullanıcı/şifresini korur. |
| Port kullanımda | Önceki geliştirme süreci veya aynı portu kullanan başka uygulama var mı kontrol edin. |
| Web açılıyor ama veriler gelmiyor | API ve workforce-service açık mı kontrol edin. Vite proxy hedefi varsayılan API portu 3000'dir. |
| Swagger açılmıyor | API terminalindeki başlangıç hatalarını ve API portunu kontrol edin. |
| vite-tsconfig-paths uyarısı | Test sonucundaki hata/başarı bölümünü kontrol edin; bu mesaj tek başına testlerin başarısız olduğunu göstermez. |