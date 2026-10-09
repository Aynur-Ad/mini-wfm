# Mini-WFM (Workforce Management System)

---

## 🛠️ Gereksinimler (Prerequisites)

Projenin yerel ortamda sorunsuz çalışabilmesi için bilgisayarınızda aşağıdaki araçların kurulu olması gerekmektedir:

* **Node.js**: v24.x.x (LTS Sürümü)
* **Paket Yöneticisi**: `pnpm` (v10+)
* **Nest CLI**: `@nestjs/cli`
* **Konteyner Yönetimi**: Docker Desktop
* **Veritabanı İstemcisi**: DBeaver veya muadili bir araç
* **API Test Aracı**: Postman, Insomnia veya yerleşik Swagger

---

## 🚀 Projeleri Çalıştırma (How to Run)

Projelerin bağımlılıkları `pnpm` ile yönetilmektedir. Projeleri ayağa kaldırmak için aşağıdaki adımları izleyin:

### 1. Bağımlılıkların Kurulması
Her iki alt projenin de kendi dizinine giderek bağımlılıkları yükleyin:

```bash
# API projesi için
cd api
pnpm install

# İkinci terminalde veya sonrasında Workforce projesi için
cd ../workforce-service
pnpm install
```

### 2. Projelerin Geliştirme (Development) Modunda Başlatılması
İki proje aynı anda çalışacağı için iki ayrı terminal sekmesi açarak aşağıdaki komutları yürütün:

* **Terminal 1 (API Servisi - Port 3000):**
  ```bash
  cd api
  pnpm run start:dev
  ```
  *Tarayıcıdan ya da Postman'den `http://localhost:3000` adresine gittiğinizde **"Hello World!"** çıktısını görmelisiniz.*

* **Terminal 2 (Workforce Servisi - Port 3001):**
  ```bash
  cd workforce-service
  pnpm run start:dev
  ```

---

### Veritabanını Başlatma
Projeyi ayağa kaldırmadan önce PostgreSQL container'ını başlatın:
\`\`\`bash
docker compose up -d
\`\`\`
Durdurmak için:
\`\`\`bash
docker compose down
\`\`\`

---
