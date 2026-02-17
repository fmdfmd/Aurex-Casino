# AUREX Casino - Полный контекст проекта

> **Последнее обновление: 11 января 2026**

---

## Общая информация
- **Название:** AUREX Casino - The Golden Empire of Win
- **Домен:** https://aurex.casino
- **Стек:** Next.js (frontend) + Express.js (backend) + PostgreSQL
- **Валюты:** RUB (основная), USD, EUR, UZS
- **Хостинг:** Railway (backend + frontend + PostgreSQL)
- **Репозиторий:** https://github.com/Vantorrr/Aurex-Casino.git

---

## URLs и инфраструктура

| Сервис | URL |
|---|---|
| Домен (основной) | https://aurex.casino |
| Backend (Railway) | https://aurex-casino-production.up.railway.app |
| Railway Public Domain | aurex-casino-production.up.railway.app |
| Диагностика сервера | https://aurex.casino/api/diag |
| VPS-прокси (Aeza) | 62.60.149.199 (nginx reverse proxy) |
| IP сервера Railway | 208.77.244.96 (проверять через /api/diag) |
| Telegram канал | https://t.me/aurex_casino |
| Telegram бот | @aurex_support_bot |

### VPS-прокси (Aeza)
- IP: 62.60.149.199
- Назначение: nginx reverse proxy от aurex.casino к Railway
- SSL: Let's Encrypt
- Защита: fail2ban (бан после 3 неудачных SSH)
- ВАЖНО: если VPS упадёт — aurex.casino не работает, но Railway URL работает

---

## SoftGamings / Fundist — Интеграция игр

### Статус: ТЕСТОВАЯ СРЕДА (apitest)

### API Credentials (ТЕСТ)
```
Endpoint:     https://apitest.fundist.org/
API Key:      437e6b584169d07e82f9a1c13339baf8
API Password: 0708739935452648
HMAC Secret:  p8mlp1ydk33510g2i9oil0xxgtkisbj8n3sq8n4q1djev5184syflj769ox0fuv3
```

### Бэк-офис (ТЕСТ)
```
URL:      https://test.fundist.org/en/
Login:    aurex_network
Password: 2x(=2oQyDp
```

### Callback URL (OneWallet)
```
https://aurex.casino/api/callback/softgamings
```

### IP сервера для вайтлиста
```
208.77.244.96  (проверять актуальный через https://aurex.casino/api/diag)
```

### Тестовый баланс
```
500 EUR
```

### Подключённые валюты у Fundist
```
EUR, RUB, USD, UZS
```

### Формат логина Fundist
```
aurex_{userId}_{currency}
Пример: aurex_1_RUB
```

### Переменные окружения на Railway (для Fundist)
Сейчас НЕ заданы — значения захардкожены в `backend/config/config.js`:
- `SLOTS_API_BASE_URL` — default: `https://apitest.fundist.org`
- `SLOTS_API_KEY` — default: `437e6b584169d07e82f9a1c13339baf8`
- `SLOTS_API_PASSWORD` — default: `0708739935452648`
- `SLOTS_HMAC_SECRET` — default: `p8mlp1ydk33510g2i9oil0xxgtkisbj8n3sq8n4q1djev5184syflj769ox0fuv3`
- `CALLBACK_URL` — default: `https://aurex-casino-production.up.railway.app/api/callback/softgamings`

**При переходе на ПРОД** — нужно задать все переменные в Railway Dashboard.

### Реализованные API методы

| Метод | Endpoint | Описание |
|---|---|---|
| Game/FullList | Fundist API | Полный каталог игр (кэшируется в RAM + файл) |
| Game/Categories | Fundist API | Категории игр |
| User/AuthHTML | Fundist API | Запуск игры (возвращает HTML-фрагмент) |
| OneWallet: ping | POST /api/callback/softgamings | Проверка связи |
| OneWallet: balance | POST /api/callback/softgamings | Баланс игрока |
| OneWallet: debit | POST /api/callback/softgamings | Списание ставки |
| OneWallet: credit | POST /api/callback/softgamings | Зачисление выигрыша |
| OneWallet: rollback | POST /api/callback/softgamings | Откат транзакции |

### Freerounds (фрираунды)
- **Статус:** ДОСТУПНЫ (через бэк-офис + API)
- **Документация:** `Fundist API Freerounds v2.9-v122-20260114_141132.pdf`
- **API endpoint:** `Freerounds/Add`, `Freerounds/Info`, `Freerounds/Remove`, `Freerounds/Check`
- **Hash:** `[OPERATOR]/Freerounds/[IP]/[TID]/[KEY]/[PWD]`
- **Поддерживаемые провайдеры:** Pragmatic Play, Hacksaw Gaming, Push Gaming, BGaming, NetEnt, Play'n GO, PG Soft, Yggdrasil, Evoplay, Thunderkick, Habanero, Spribe, GameArt, Kaga, Endorphina и 50+ других (см. Appendix FR1 в документации)

### Провайдеры (ID систем)
```
3 Oaks Gaming (924), 7777Gaming (312), AGTSoftware/Platipus (845),
Apollo (950), Aviator Studio/Spribe (773), AviatrixDirect (791),
BGaming (901), BeeFee (914), Belatra (956), BetGames.tv (990),
BetSoft (991), BetSolutions (882), BetradarVS (952),
BigTimeGaming (338), CQ9 (923), CT Interactive (885),
ConceptGaming (929), Endorphina (973), EurasianGaming (864),
Evolution (998), Evoplay (349), EvoOSS/NetEnt/RedTiger (892),
Ezugi (983), FBastards (796), Fa Chai (827), Fugaso (927),
GameArt (955), Gamzix (879), Genii (930), Habanero (976/865),
HacksawGaming (850), HoGaming (904), ICONIC21 Live (314),
Igrosoft (926), InOut (816), JDB (834), JiliAsia (819),
Kaga (898/835), Kalamba (874), Kiron (974), LiveGames (934),
LuckyStreak (980), Mascot Gaming (899), Microgaming (870),
NetEnt (421), NetgameEntertainment (867), NovomaticGames (307),
NucleusGaming (842), Onlyplay (896), Oriental Games (814),
OriginalGames (777), PGSoft (939), PLS (412/860),
PeterAndSons (805), Platipus (949), Play'n GO (944),
PopiPlay (828), Popok/Betconstruct (339/854),
Pragmatic Play (960), Pragmatic Play Live (913),
Push Gaming (911), RedTigerOSS (420), RevDev (810),
RevolverGaming (902), SAGaming (968), SalsaTechnology (947),
SimplePlay (844), Slotmill (846), SmartSoft (869),
Spadegaming (919), Spinomenal (959), Spinthon (851),
Spribe (895), TVBet (900), Thunderkick (920),
TomHornGaming (422/987), TurboGames (849), Upgaming (872),
UrgentGames (797), Victory Ark Gaming (792), VivoGaming (945),
WMCasino (866), Wazdan (941), YGRGames (818),
Yggdrasil (953), iMoon (813)
```

### Кэширование каталога игр
- **RAM:** In-memory кэш в `FundistApiService`
- **Диск:** `backend/data/fundist-full-list.json`
- **Обновление:** фоновый refresh при обращении
- **Fallback:** если API недоступен — берёт с диска

### Каталог игр — Сортировка
- **Curated list:** 80+ слотов + 30 live-игр в фиксированном порядке
- **Первый слот:** Big Bamboo (Push Gaming)
- **Тиры провайдеров:** Tier 1 (Pragmatic, Hacksaw, Push, Play'n GO, BGaming, NetEnt, Endorphina...) → Tier 2 → Tier 3 → Tier 4 (Live Casino)
- **Файл:** `backend/routes/slotsApi.js` — `topGameCodes` и `providerTier`

### Отображение игр (GameModal)
- **Метод:** iframe + `document.write` — HTML-фрагмент от Fundist записывается в iframe
- **CSS:** полная страница с `object-cover` для вложенных iframe провайдеров
- **UI:** панель сверху (Назад / название / X), игра ниже header (top: 64px)
- **Файл:** `frontend/components/GameModal.tsx`

### Проксирование картинок
- **Endpoint:** `GET /api/slots/img?u=<url>`
- **Whitelisted hosts:** `agstatic.com`, `img.cdn-fundist.com`
- **Keep-alive agent:** общий пул TCP соединений

### Документация Fundist (файлы в проекте)
- `Fundist API v285(wr)-v93-20251128_090354.pdf` — основной API
- `Fundist API OneWallet v133(wr)-v56-20251128_090443.pdf` — OneWallet протокол
- `Fundist API Freerounds v2.9-v122-20260114_141132.pdf` — фрираунды
- `GamesRTP.csv` — полный список игр с RTP, волатильностью, ставками
- `OWClientTest_v2.14.safext` — утилита для тестирования OneWallet (переименовать в .jar)

### Тестирование OneWallet
```bash
# Переименовать .safext → .jar
export OWTEST_READ_TIMEOUT=2000
java -jar OWClientTest_v2.14.jar \
  --host https://aurex.casino/api/callback/softgamings \
  --secret p8mlp1ydk33510g2i9oil0xxgtkisbj8n3sq8n4q1djev5184syflj769ox0fuv3 \
  --users aurex_1_RUB=RUB aurex_2_USD=USD
```

### Требования перед выходом в ПРОД
1. Предоставить SoftGamings 2 аккаунта (USER_ID, валюта) для их внутренних тестов
2. Предоставить исчерпывающий список доменов для согласования
3. Получить продакшн API credentials (отдельные от теста)
4. Добавить IP прод-сервера в вайтлист Fundist
5. Настроить переменные окружения на Railway (заменить захардкоженные тестовые)

---

## Авторизация

### Способы входа
- **Телефон:** регистрация через SMS (uCaller flash-call)
- **Google OAuth:** настроен (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET на Railway)
  - Redirect URI: `https://aurex.casino/api/auth/google/callback`
  - Google Cloud проект: "AUREX casino"
- **Telegram Login:** виджет + `data-auth-url`
  - Бот: @aurex_support_bot
  - Домен: aurex.casino (установлен в @BotFather)
  - Endpoint: `GET /api/auth/telegram/callback`
- Соцсети создают пользователя без пароля (password nullable)

---

## Бонусная система

### Приветственный пакет (4 депозита)
1. 200% на первый депозит
2. 150% на второй
3. 100% на третий
4. 75% на четвёртый

### Кэшбэк
- Еженедельно, по понедельникам
- 5-15% в зависимости от VIP-уровня
- Вейджер x5

### VIP система (5 уровней)
| Уровень | Очки | Кэшбэк |
|---|---|---|
| Bronze | 0 | 5% |
| Silver | 5,000 | 7% |
| Gold | 25,000 | 10% |
| Platinum | 100,000 | 12% |
| Emperor | 500,000 | 15% |

**Прогресс-бар:**
- Минимальная видимость: если есть хотя бы 1 очко — шкала показывает минимум 3% (для визуальной заметности)
- Формула: `((userPoints - currentLevel.pointsRequired) / (nextLevel.pointsRequired - currentLevel.pointsRequired)) * 100`
- Console debug: `🎯 VIP Progress Debug` в браузере (F12) показывает текущие значения
- Файл: `frontend/pages/vip.tsx` (строки 204-219)

### Система лояльности
- 1 очко за каждые 100₽ ставки
- Магазин: фриспины, бонусы, бусты (кэшбэк+, очки x2)
- Путь: `/api/loyalty/*`

### Промокоды
- Различные типы бонусов
- Управление через админ-панель

### Реферальная система
- 5 уровней партнёров (10-20% комиссии)
- Автоматическая генерация реферального кода

---

## Структура БД (PostgreSQL)

### Основные таблицы
- `users` — пользователи (balance, currency, google_id, telegram_id, is_admin)
- `transactions` — все транзакции
- `bonuses` — бонусы
- `game_sessions` — игровые сессии (user_id, game_id, session_id, provider, currency, status, bet_amount, win_amount)
- `cashback_records` — кэшбэк
- `loyalty_purchases` — покупки VIP
- `user_boosts` — активные бусты
- `tickets` — тикеты поддержки
- `promocodes` — промокоды
- `tournaments` — турниры

### Миграции
- `001_init.sql` — `008_social_auth.sql` (все применены)

---

## API структура

### Backend endpoints
| Путь | Описание |
|---|---|
| `/api/auth/*` | Регистрация, логин, Google, Telegram |
| `/api/slots/games` | Каталог игр (из Fundist) |
| `/api/slots/start-game` | Запуск игры (POST) |
| `/api/slots/game-frame` | Хранение/отдача HTML игры |
| `/api/slots/img` | Прокси картинок игр |
| `/api/callback/softgamings` | OneWallet callbacks |
| `/api/config/*` | Конфигурация (VIP, провайдеры) |
| `/api/users/*` | Профиль, настройки |
| `/api/payments/*` | Депозиты, выводы |
| `/api/bonuses/*` | Бонусы |
| `/api/cashback/*` | Кэшбэк |
| `/api/loyalty/*` | VIP магазин |
| `/api/referral/*` | Реферальная программа |
| `/api/tickets/*` | Тикеты |
| `/api/admin/*` | Админ-панель |
| `/api/diag` | Диагностика (IP, конфиг) |
| `/api/health` | Health check |

---

## Ключевые файлы

### Backend
| Файл | Описание |
|---|---|
| `backend/config/config.js` | Все конфигурации (API ключи, JWT, БД) |
| `backend/server.js` | Express сервер, роуты, диагностика |
| `backend/services/fundistApiService.js` | Fundist API: каталог, запуск игр, кэш |
| `backend/routes/slotsApi.js` | Каталог игр, сортировка, прокси, game-frame |
| `backend/routes/softgamingsCallback.js` | OneWallet: balance, debit, credit, rollback |
| `backend/routes/auth.js` | Авторизация (регистрация, логин, соцсети) |
| `backend/middleware/auth.js` | JWT middleware (req.user с balance, currency) |
| `backend/constants/fundistMerchants.js` | Маппинг MerchantID → имя провайдера (60+) |

### Frontend
| Файл | Описание |
|---|---|
| `frontend/pages/games/index.tsx` | Страница игр (категории, фильтры, провайдеры) |
| `frontend/components/GameModal.tsx` | Модал запуска игры (iframe + document.write) |
| `frontend/components/GameCard.tsx` | Карточка игры (картинка, RTP, провайдер) |
| `frontend/store/authStore.ts` | Zustand: авторизация, баланс, валюта |
| `frontend/store/settingsStore.ts` | Настройки (язык, валюта отображения) |
| `frontend/next.config.js` | Rewrites (/api → backend), headers |
| `frontend/pages/_app.tsx` | Viewport meta (viewport-fit=cover для iOS) |

---

## Telegram бот (@aurex_support_bot)
- AI-ассистент Стефани (OpenRouter API)
- Тикет-система с менеджерами
- Используется для Telegram Login Widget
- Папка: `/telegram-bot/`

---

## Платёжные системы (в работе)

### Piastrix (переговоры)
- Электронный кошелёк, популярен в РФ казино
- Ведётся переписка

### LavaTop
- Конфиг в `config.js`: apiUrl, shopId, apiKey (пока заглушки)

---

## Агрегаторы игр (история)

### SoftGamings — ВЫБРАН
- Fundist API интеграция завершена (тестовая среда)
- OneWallet протокол реализован
- Каталог: 11,000+ игр, 80+ провайдеров
- Контакт: поддержка через email

### Slotgrator — отклонён
- Депозит $5,000, GGR 11-15%
- Помощь с лицензией Белиз (€1,900/год)

### Nuxgame — отклонён
- Депозит $5,000, GGR 7.5-15%
- Нет платежей

---

## Важные технические решения

1. **OneWallet Login формат:** `aurex_{userId}_{currency}` (например `aurex_1_RUB`) — чтобы Fundist создавал аккаунт с правильной валютой
2. **parseUserId:** извлекает числовой ID из обоих форматов (`"1"` и `"aurex_1_RUB"`)
3. **casinoIp = '0.0.0.0'** — в хеше используется 0.0.0.0 для динамических IP
4. **Currency mismatch:** OneWallet не блокирует при несовпадении валюты (warning, не error)
5. **Категории:** slots, live, table, crash, sport — определяются по MerchantID провайдера
6. **game_sessions:** таблица НЕ имеет колонки `updated_at` — не использовать в UPDATE
7. **MongoDB удалён** — только PostgreSQL
8. **Password nullable** — для Google/Telegram пользователей

---

## Чеклист: Что сделано / Что осталось

### Сделано
- [x] Регистрация / авторизация (телефон, Google, Telegram)
- [x] Fundist API интеграция (Game/FullList, User/AuthHTML)
- [x] OneWallet протокол (ping, balance, debit, credit, rollback)
- [x] Каталог игр с картинками (11,000+ игр)
- [x] Курируемая сортировка слотов и live (80+ слотов, 30 live)
- [x] Провайдеры маппинг (60+ MerchantID → имена)
- [x] Бонусная система (приветственный пакет, кэшбэк, промокоды)
- [x] VIP система (5 уровней)
- [x] Реферальная программа
- [x] Telegram бот (поддержка + AI)
- [x] Админ-панель
- [x] Мультивалютность (RUB, USD, EUR, UZS)

### В процессе
- [ ] Тестирование Live Casino (чёрные экраны на некоторых играх)
- [ ] Переход на продакшн Fundist (получить прод credentials)
- [ ] Подключение платежей (Piastrix / крипта)

### Потом
- [ ] Юрлицо (Белиз через Slotgrator)
- [ ] Игровая лицензия
- [ ] Спортивные ставки (реальные, не виртуальные)
- [ ] Найм саппортов

---

## Промо-материалы
- Google Drive: https://drive.google.com/drive/folders/0BwYUAH58_7YPRWpNVFJRSU5XM1U?resourcekey=0-YCd6ydcrV755OJYSHTEjFA&usp=drive_link
- Также в бэк-офисе Fundist: раздел Client Area

---

*Последнее обновление: 11 января 2026*
