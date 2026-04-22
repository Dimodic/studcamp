# Studcamp

Веб-приложение для организаторов и участников студенческих кемпов —
расписание, команды проектов, посещаемость, люди, материалы, кампус.

## Что умеет

**Участник видит:**

- Главную с ближайшими событиями, орг-обновлениями и сторис.
- Расписание по дням, отметку «я здесь».
- Свою команду и выбранный проект.
- Людей в кемпе, материалы, ресурсы, карту кампуса.
- Бейдж с QR-кодом для входа.

**Организатор дополнительно:**

- Создаёт/редактирует/скрывает события, проекты, истории, материалы,
  ресурсы, разделы кампуса, пользователей.
- Управляет фазами выбора проектов + авто-распределение участников по
  приоритетам в команды, ручная правка.
- Раздел «Посещаемость»: таблица участник×занятие с click-to-toggle и
  LLM-распознаванием листков-подписей (кормим фото → модель выдаёт список
  расписавшихся → применяем).
- Создаёт и переключает активный кемп — при смене все участники и
  преподаватели видят новый (содержимое изолировано per-camp).
- «Магический ввод»: кидает в LLM любой текст или файл (скопированное
  расписание, анкета, google-doc), получает на выходе структурированные
  события/проекты/материалы к ревью.

## Стек

- **Frontend**: React 19 + TypeScript strict + Vite 8 + Tailwind 4 +
  react-router 7. Тесты на Vitest + Testing Library.
- **Backend**: FastAPI + SQLAlchemy 2 + Alembic + Pydantic v2, Python 3.12.
  Pytest + mypy strict + ruff.
- **Инфра**: PostgreSQL 16, nginx (раздача фронта + прокси /api),
  docker compose. Пароли — bcrypt, сессии — `secrets.token_urlsafe`,
  SSRF-guard для LLM-endpoint'ов, rate-limit на login/llm.
- **Мобильная оболочка**: Capacitor 8 для Android.

## Развернуть на сервере — одной командой

```
docker compose up -d --build
```

Первый запуск:

- Собирает фронт (Vite build) и backend-образ.
- Поднимает Postgres, ждёт пока стартует.
- Применяет Alembic-миграции.
- Сеет пустой кемп + организатора (если БД пустая; идемпотентно).
- Поднимает FastAPI под gunicorn.
- Запускает nginx с собранным фронтом.

Приложение будет доступно на `http://<host>:8080`.

Логин по умолчанию:

- `organizer@studcamp.local` / `studcamp123` — организатор.

### Кастомизация

Все настройки — через `.env` рядом с `docker-compose.yml`
(шаблон — `.env.example`):

```
cp .env.example .env
# редактируешь по вкусу
docker compose up -d --build
```

Что меняется:

- `WEB_PORT` — на каком порту публикуется nginx (по умолчанию 8080).
- `STUDCAMP_CORS_ORIGINS` — если фронт и API на разных хостах.
- `POSTGRES_*` — креды БД.

### Telegram WebApp-авторизация

Вместо email/password — вход через Telegram с проверкой, что пользователь
состоит в закрытой группе кемпа. Форма логина внутри Telegram не показывается:
auto-login происходит по `window.Telegram.WebApp.initData`.

**Настройка бота (однократно)**:

1. В [@BotFather](https://t.me/BotFather) — `/newbot`, сохранить bot-token.
2. `/newapp` → выбрать бота → короткое имя, title, URL = `https://<ваш-домен>/`.
3. `/setmenubutton` → ссылка на тот же URL (кнопка «≡» у чата с ботом).
4. `/setprivacy` → Disabled (чтобы бот видел состав группы).
5. Добавить бота **в приватную группу кемпа** (хотя бы участником; админом
   надёжнее — `getChatMember` всегда работает).
6. Узнать `chat_id` группы: после любого сообщения от бота в ней —
   `curl https://api.telegram.org/bot<TOKEN>/getUpdates`, брать
   `message.chat.id` (для супергрупп — отрицательный `-100…`).

**Прописать в `.env`**:

```
STUDCAMP_TELEGRAM_BOT_TOKEN=123456789:AAE...
STUDCAMP_TELEGRAM_GROUP_ID=-1002234567890
```

Если эти переменные пусты — endpoint `/auth/telegram` отвечает 503, и
приложение работает только через email/password (удобно для dev).

**HTTPS обязателен**. Telegram открывает WebApp только по `https://`.
Самый простой способ — Caddy перед docker-compose:

```
# /etc/caddy/Caddyfile
camp.example.com {
    reverse_proxy localhost:8080
}
```

```
apt install caddy && systemctl enable --now caddy
```

Caddy автоматически выпустит сертификат от Let's Encrypt и будет
перенаправлять `https://camp.example.com` → `http://localhost:8080`.
Альтернативы: Cloudflare Tunnel (без открытых портов), nginx + certbot.

**Как оно работает**:

1. Пользователь открывает WebApp в Telegram.
2. Фронт читает `window.Telegram.WebApp.initData` — подписанную ботом
   строку с `user.id`, `username`, `first_name`, `auth_date`, `hash`.
3. Фронт шлёт initData в `POST /api/v1/auth/telegram`.
4. Backend проверяет HMAC-SHA256 подпись bot-токеном, что initData свежая
   (≤ 1 час), и дёргает Bot API `getChatMember(group_id, user.id)`.
5. Если в группе — upsert `User` по `telegram_id`, выдаёт сессионный токен;
   если нет — 403 и «Нет доступа» на экране.

Для dev-режима вне Telegram (и в CI) обычный `POST /auth/login` с email
оставлен как есть.

### Обновление

```
git pull
docker compose up -d --build
```

Миграции накатятся автоматически, seed пропустится (в БД уже есть данные).
Если нужно насильно переселить чистый seed:

```
docker compose exec api python -m backend.app.seed_data --force
```

### Остановить / удалить данные

```
docker compose down             # остановить, данные БД сохранить
docker compose down -v          # + удалить том с Postgres
```

---

## Разработка локально (без Docker)

Требуется Python 3.12+ и Node 24+.

**Backend:**

```
cd backend
python -m pip install -e ".[dev]"
alembic -c alembic.ini upgrade head
python -m backend.app.seed_data       # из корня проекта
python -m uvicorn backend.app.main:app --reload
```

**Frontend:**

```
npm ci
npm run dev       # http://localhost:5173
```

По умолчанию фронт обращается к `http://localhost:8000/api/v1` — это
default в `app/lib/api.ts`. Для переопределения —
`VITE_API_BASE_URL=http://api.example.com/api/v1 npm run dev`.

## Скрипты

Frontend (`npm run`):

| Скрипт                                  | Что делает                                            |
| --------------------------------------- | ----------------------------------------------------- |
| `dev`                                   | Vite dev-сервер с HMR.                                |
| `build`                                 | Продакшен-сборка в `dist/`.                           |
| `typecheck`                             | `tsc --noEmit` — строгая проверка типов.              |
| `lint` / `lint:fix`                     | ESLint flat-config.                                   |
| `format` / `format:check`               | Prettier.                                             |
| `test` / `test:watch` / `test:coverage` | Vitest (jsdom + Testing Library).                     |
| `android:apk`                           | Build + `cap sync android` + `gradlew assembleDebug`. |

Backend (из `backend/`):

| Команда                          | Что делает                             |
| -------------------------------- | -------------------------------------- |
| `ruff check .` / `ruff format .` | Линтер + форматтер.                    |
| `mypy app`                       | Строгая проверка типов.                |
| `pytest -q`                      | Тесты (интеграционные с SQLite в tmp). |
| `alembic upgrade head`           | Применить миграции.                    |

## Структура проекта

```
studcamp/
├── app/                          Frontend (React + TS)
│   ├── pages/                    Роутные компоненты (home, schedule, …)
│   ├── components/               Переиспользуемое: admin-editor, common, layout
│   ├── hooks/, lib/              Хуки + API-клиент + контексты
│   ├── styles.css, main.tsx, routes.tsx
│
├── backend/                      Backend (FastAPI)
│   ├── app/
│   │   ├── api/routes/           auth, bootstrap, llm, admin/*
│   │   ├── core/                 config, security, rate_limit, url_guard
│   │   ├── db/                   session, seed, base
│   │   ├── models/entities.py    SQLAlchemy-модели
│   │   ├── schemas/api.py        Pydantic-схемы публичного API
│   │   └── services/bootstrap/   Сборка /bootstrap payload
│   ├── alembic/versions/         Миграции
│   ├── seeds/initial_data.json   Минимальный production-seed
│   ├── tests/                    Pytest + фикстура с mock-кемпом
│   ├── Dockerfile, pyproject.toml, alembic.ini
│
├── android/                      Capacitor wrapper (для APK)
├── .github/workflows/ci.yml      CI: lint + typecheck + tests + build + migrations
├── Dockerfile, nginx.conf        Frontend-контейнер
├── docker-compose.yml            Одна команда → db + api + web
├── .env.example                  Шаблон переменных окружения
```

## CI

`.github/workflows/ci.yml` запускает на каждый push в `main` и PR:

- **Frontend**: `npm ci` → `typecheck` → `lint` → `format:check` →
  `test` → `build`.
- **Backend**: `pip install ./backend[dev]` → `ruff check` →
  `ruff format --check` → `mypy` → `pytest --cov`.
- **Migrations**: поднимает `postgres:16-alpine` как service, прогоняет
  `alembic upgrade head`.

## Лицензия

Internal project, не публикуется.
