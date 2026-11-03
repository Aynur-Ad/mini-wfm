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

API veritabanına bağlanmadığından bu kurulum için `api/.env.example` dosyasını kopyalamak gerekmez.

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

`web/package.json` içinde henüz test script’i bulunmuyor. Frontend için aşağıdaki build ve lint komutlarını kullanın.

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

Mevcut sürümde bazı ekip ve AppController dosyaları lint uyarıları verebilir. Komutun başarısız olmasına neden olan hatalar ile uyarıları ayrı değerlendirin.

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

## Personel ekranlarını kontrol etme (Task 18)

Üç uygulama ve PostgreSQL açıkken web menüsünden **Personeller** sayfasına girin.

- **Liste:** Sicil No, Ad Soyad, Telefon, Durum ve İşlemler kolonları gösterilir. Telefon `532 123 45 67` biçimindedir; boş telefon `-` görünür. Liste sunucudan sayfalı alınır.
- **Arama ve filtre:** Ad, soyad veya sicilin bir kısmıyla arayın. Arama, yazma durduktan 400 ms sonra gönderilir. Tümü/Aktif/Pasif filtresi aramayla birlikte çalışır; filtre değişince ilk sayfaya dönülür.
- **Oluşturma ve düzenleme:** Yeni Personel veya Düzenle butonunu kullanın. Ad/soyad zorunlu ve en fazla 100, sicil zorunlu ve en fazla 20 karakterdir. Telefon isteğe bağlıdır; girilirse 5 ile başlayan 10 rakam olmalıdır. Boşluklardan oluşan zorunlu alanlar kabul edilmez.
- **Hata ve başarı:** Başarılı kayıtta liste/detay güncellenir. Tekrarlanan sicilde backend'in 409 bildirimi gösterilir ve formdaki değerler korunur. Düzenlemede telefonu boşaltmak mevcut numarayı temizler.
- **Durum:** Satırdaki anahtarla aktif/pasif durumunu değiştirin. Sayfayı yenileyerek değişikliğin korunduğunu kontrol edin.
- **Silme:** Önce onaydan vazgeçin; kayıt kalmalıdır. Ardından onaylayın; kayıt listeden kalkmalıdır. Son sayfanın son kaydı silinirse geçerli önceki sayfaya dönülür.
- **Detay:** Sicil bağlantısından personel bilgilerini açın. Düzenleme sonrası bilgilerin güncellendiğini kontrol edin. Veritabanında bulunmayan bir ID için Personel bulunamadı ekranı ve Listeye dön butonu gösterilir. Bağlantı/sunucu hatalarında ayrı bir hata ekranı ve yeniden deneme bulunur.

Bu kontroller gerçek servisler ve veritabanıyla yapılır. Frontend build/lint kontrolü veya mock kullanılan testler tek başına bu uçtan uca kontrolün yerini tutmaz.

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