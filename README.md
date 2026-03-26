```
______                                      _ 
| ___ \                                    (_)
| |_/ /__ _   ___  _ __ ___    __ _  _ __   _ 
|  __// _` | / __|| '_ ` _ \  / _` || '_ \ | |
| |  | (_| || (__ | | | | | || (_| || | | || |
\_|   \__,_| \___||_| |_| |_| \__,_||_| |_||_|
```

# TdA26-pacmani

## Tour de App 2026

### Název týmu

**Pacmani**

---

### Členové týmu a role

* **[Marek Brož](https://github.com/mr12n21)** - Fullstack + Architecturer
* **[Marek Vyleťal](https://github.com/Markusdeatrius)** – Frontend vývoj

---

## Použité technologie

### Backend (server)

* **Node.js** (ESM)
* **TypeScript**
* **Express** – REST API
* **Prisma ORM** – databázová vrstva, migrace
* **PostgreSQL**
* **JWT (jsonwebtoken)** – autentizace
* **bcryptjs** – hashování hesel
* **Zod** – validace vstupních dat
* **Multer** – upload souborů
* **Express Rate Limit** – ochrana API
* **Pino** – strukturované logování

Vývoj a nástroje:

* **ts-node-dev** – vývojový server
* **ESLint & Prettier** – kvalita a formátování kódu
* **Jest / Supertest** – testování (omezeně)
* **Prisma CLI** – migrace, seed, generování klienta

---

### Frontend (web)

* **Vue 3** (Composition API)
* **TypeScript**
* **Vite** – build & dev server
* **Vue Router** – routing
* **Pinia** – správa stavu
* **Tailwind CSS** – styling
* **PostCSS & Autoprefixer**

Testování a vývoj:

* **Vitest** – unit testy
* **Playwright** – E2E testy
* **ESLint & Prettier**
* **Vue Devtools plugin**

---

### Infrastruktura a DevOps

* **Docker & Docker Compose**
* **Caddy** – reverse proxy
* **GitHub Actions** – CI/CD
* **Linux (musl, OpenSSL 3)** – produkční prostředí

---

## Databáze a Prisma ORM

Projekt používá **Prisma ORM** jako hlavní nástroj pro práci s databází. Prisma zajišťuje typově bezpečný přístup k datům, správu migrací a přehlednou definici datového modelu.

### Konfigurace

* Databáze: **PostgreSQL**
* Připojení k databázi pomocí proměnné prostředí `DATABASE_URL`
* Prisma Client je generován pro:

  * `native`
  * `linux-musl-openssl-3.0.x` (Docker / produkce)

### Datový model

Datový model pokrývá kompletní doménu aplikace:

* **User**

  * Role: `STUDENT`, `LECTURER`, `ADMIN`
  * Vazby na kurzy, materiály, kvízy, feed a dokumenty
* **Course**

  * Kurzy vlastněné lektory
  * Materiály, kvízy, feed, lajky
* **Material**

  * Typy `FILE` / `URL`
  * Navázané na kurz a autora
* **Quiz, Question, QuizResult**

  * Kvízový systém a vyhodnocení
* **FeedPost**

  * Manuální i automatické příspěvky
* **Like**

  * Unikátní kombinace uživatel–kurz
* **Document**

  * Nahrané dokumenty uživatelů

Optimalizace:

* **indexy** pro výkon
* **relační vazby** s `onDelete: Cascade`
* **automatické timestampy** (`createdAt`, `updatedAt`)

### Migrace a práce s databází

```bash
# Migrace
npx prisma migrate dev

# Generování klienta
npx prisma generate

# Grafické rozhraní
npx prisma studio
```

Prisma Studio slouží pro:

* ladění dat
* kontrolu vztahů
* rychlé úpravy při vývoji

---

## Spuštění aplikace

### Lokální spuštění

Pro lokální vývoj je nutné mít **Docker** a **Docker Compose**.

```bash
docker compose up --build
```

* Aplikace se automaticky sestaví a spustí
* První spuštění trvá cca **1–3 minuty**

---

### Přihlašovací údaje

**Lektor**

* Username: `lecturer`
* Password: `TdA26!`

---

## API

* **API implementuje funkce dle zadání**
* Rozšířeno o **registraci a autentizaci uživatelů**

### API dokumentace

* Specifikace v souboru `openapi.yaml`
* Doporučený nástroj: **Swagger Editor**

---

## Nasazení (Deploy)

* Automatické nasazení pomocí **GitHub Actions**
* Stačí **push do větve `deploy`**
* Nasazení trvá přibližně **5 minut**

---

## Další informace

* Aplikace je **responzivní 👌**

  * mobil
  * tablet
  * desktop (testováno primárně ve **Firefoxu**)
* Dodržen **brand manuál 😉**
* UI navrženo s důrazem na **přehlednost a použitelnost💯**

---
