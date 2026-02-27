# AUREX Casino - Полный контекст проекта

> **Последнее обновление: 27 февраля 2026** (рефералы, верификация, профиль, чат поддержки, транзакции)

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
| Домен (основной) | https://aurex.casino (заблокирован РКН, работает только через VPN в РФ) |
| Зеркало РФ (рабочее) | https://aurex1.casino (не в реестре РКН, работает в РФ без VPN) |
| Зеркала (резерв) | aurex2.casino — aurex10.casino (DNS не привязан, в резерве) |
| Backend (Railway) | https://aurex-casino-production.up.railway.app |
| Railway Internal | xtjxpx6j.up.railway.app (используется в nginx proxy_pass) |
| Диагностика сервера | https://aurex.casino/api/diag |
| VPS-прокси (4VPS.su) | 185.236.20.24 (nginx reverse proxy, Нидерланды/Амстердам) |
| Cloudflare | Активен, Free план, аккаунт Cazinovarush@gmail |
| IP сервера Railway | 208.77.244.96 (проверять через /api/diag) |
| Telegram канал | https://t.me/aurex_casino |
| Telegram бот | @aurex_support_bot |

### Архитектура трафика
```
aurex.casino:  Пользователь → Cloudflare → VPS 185.236.20.24 (nginx, NL) → Railway
aurex1.casino: Пользователь (РФ) → Cloudflare (серое облако) → VPS 89.221.203.205 (nginx, Москва) → Railway
```
- **Cloudflare:** DNS-прокси, SSL (Edge + Origin), DDoS защита, скрытие IP VPS
- **Cloudflare NS:** `aron.ns.cloudflare.com`, `bruce.ns.cloudflare.com`
- **Cloudflare SSL:** Full (aurex.casino, aurex1.casino). TLS 1.3 **выключен** на обоих доменах (РКН блокирует ECH)
- **ВАЖНО:** при добавлении нового зеркала — обязательно выключать TLS 1.3 в Cloudflare Edge Certificates
- **Cloudflare Zone ID:** `127e1fd2ca27bfcd4b466467d11ce9a9`
- **Регистратор:** Namecheap (NS перенаправлены на Cloudflare)

### VPS-прокси (4VPS.su — Нидерланды, Амстердам)
- IP: 185.236.20.24 (**скрыт за Cloudflare**, не виден пользователям)
- Доступ: root / mD5IT47T9m227
- Хостер: 4VPS.su, тариф NL-cx01 (1 ядро, 1GB RAM, 10GB NVMe, 420₽/мес)
- ОС: Ubuntu 22.04
- Назначение: nginx reverse proxy → Railway
- SSL Origin: Let's Encrypt (автообновление certbot)
- Защита: fail2ban (SSH)
- Nginx: `real_ip_header CF-Connecting-IP` — восстанавливает реальный IP клиента из Cloudflare
- ВАЖНО: если VPS упадёт — aurex.casino не работает, но Railway URL работает
- **История:** Предыдущий VPS (Aeza, 62.60.149.199) заблокирован 24.02.2026 за размещение казино. Миграция на 4VPS.su выполнена 24.02.2026.

### VPS-прокси (4VPS.su — Россия, Москва) — для aurex1.casino
- IP: 89.221.203.205 (DNS A-запись Cloudflare, **серое облако** — трафик идёт напрямую)
- Доступ: root / J0TBdI3uO3245
- Хостер: 4VPS.su, Россия/Москва
- ОС: Ubuntu 22.04
- Nginx: 1.28.2 (обновлён с 1.18.0, исправлен баг HTTP/2 proxying)
- Назначение: nginx reverse proxy → Railway (для aurex1.casino, внутри-РФ трафик)
- SSL Origin: Let's Encrypt (certbot, сертификат выпущен 25.02.2026)
- **Зачем:** Cloudflare серое облако + российский VPS = трафик не пересекает границу РФ → нет DPI/TSPU блокировки, быстрее загрузка
- Nginx конфиг: `listen 443 ssl; http2 on;` (синтаксис Nginx 1.28+)
- Проксирует: `proxy_pass https://xtjxpx6j.up.railway.app` с `Host: aurex1.casino`
- Forwards: `Origin`, `Referer`, `Upgrade`, `Connection` headers
- **ВАЖНО:** если этот VPS упадёт — aurex1.casino не работает, но aurex.casino (через NL VPS) и Railway URL продолжат работать

### Домены и блокировки

#### aurex.casino (основной бренд)
- **Статус:** заблокирован РКН (реестр Роскомнадзора) — не работает в РФ без VPN
- **Cloudflare:** активен, оранжевое облако, NS: Cloudflare
- **SSL/TLS:** TLS 1.3 **выключен** (РКН блокирует ECH), режим Full
- **Работает:** из-за рубежа + из РФ через VPN
- **Причина блокировки:** вероятно, Aeza репортнули домен при обнаружении казино на сервере

#### aurex1.casino (зеркало для РФ)
- **Статус:** НЕ в реестре РКН — работает в РФ без VPN
- **Cloudflare:** добавлен 24.02.2026, NS: `aron.ns.cloudflare.com` / `bruce.ns.cloudflare.com`
- **DNS:** A → `89.221.203.205` (DNS only, серое облако — трафик напрямую на российский VPS)
- **SSL/TLS:** TLS 1.3 **выключен**, Always HTTPS вкл
- **Railway:** домен `aurex1.casino` добавлен в Aurex Front, TXT верификация `_railway-verify` в Cloudflare DNS
- **VPS nginx:** российский VPS `89.221.203.205`, конфиг `/etc/nginx/sites-enabled/aurex1.casino`, Nginx 1.28.2
- **VPS SSL:** Let's Encrypt сертификат выпущен 25.02.2026 (истекает 26.05.2026)
- **Платёжки:** return URL берётся динамически из `Origin` заголовка — работает на любом домене
- **Реферальная ссылка:** бэкенд берёт домен из `Host` (приоритет), `Origin` (fallback), `aurex1.casino` (default) — работает на любом зеркале

#### Резервные домены
- **aurex2.casino — aurex10.casino** (оплачены на Namecheap, DNS НЕ привязан)
- **Держать "холодными"** — без DNS записей, невидимы для РКН
- **SoftGamings:** все 11 доменов уже согласованы для прода

#### При блокировке зеркала
  1. Добавить следующий домен (aurex2.casino) в Cloudflare
  2. A-запись на российский VPS `89.221.203.205` (серое облако, DNS only)
  3. Обновить nginx `server_name` + certbot на российском VPS
  4. Добавить домен в Railway (Settings → Networking)
  5. TLS 1.3 выключить в Cloudflare
  6. Готово за 15 минут

#### При блокировке IP VPS
  1. Купить новый VPS (новый IP!)
  2. В Cloudflare поменять A-запись на новый IP
  3. Скопировать nginx конфиг + certbot
  4. Готово за 15-20 минут
- **Railway (бэкенд) в безопасности всегда** — его IP скрыт за Cloudflare → VPS

### Fundist IP вайтлист (nginx на VPS)
- Callback `/api/callback/softgamings` доступен ТОЛЬКО с IP Fundist:
  - Тест: `178.16.18.149`, `178.16.18.152`
  - Прод: `78.28.223.29`, `78.28.223.18`, `89.111.53.78`, `89.111.53.79`, `178.16.18.131`, `178.16.18.132`, `217.28.62.117`, `217.28.62.118`
- Все остальные IP получают 403 Forbidden

---

## SoftGamings / Fundist — Интеграция игр

### Статус: ПРОД-КРЕДЫ ПОЛУЧЕНЫ, ждём платёжку для выхода в лайв

### API Credentials (ПРОД)
```
Endpoint:     https://apiprod5.fundist.org/
API Key:      ca95ade0b4581ab72f9d300bb691b6d2
API Password: 9845491425948026
HMAC Secret:  7c6fl7fo1p5cei36ijuddlg44aeeprlmgs66ay88rcperlhvy7w0v008sbt2j9y2
```

### Бэк-офис (ПРОД)
```
URL:      https://www5.fundist.org/en/
Login:    aurex_network_prod
Password: r8Rtrr6O.~
```

### API Credentials (ТЕСТ) — оставляем для разработки
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

### Прод-баланс
```
100 EUR — только для финальных тестов, транзакции идут в инвойс!
```

### Правила выхода в лайв (от SoftGamings)
- Сообщить минимум за **24 часа** до запуска
- Запуски **НЕ по пятницам** (только пн-чт)
- До лайва — закрыть доступ для всех кроме команды
- Новые домены — согласовать заранее, иначе провайдеры могут отключить игры
- Тикет: SG#847161

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
- **RAM:** In-memory кэш в `FundistApiService` (TTL: 1 час)
- **Диск:** `backend/data/fundist-full-list.json`
- **Обновление:** фоновый refresh при обращении
- **Принудительный сброс:** `FundistApiService.invalidateCache()` — обнуляет RAM-кэш и перезагружает каталог из Fundist API
- **Endpoint:** `POST /api/slots/catalog/refresh` — вызывает `invalidateCache()`, возвращает кол-во игр
- **Fallback:** если API недоступен — берёт с диска

### Каталог игр — Сортировка
- **Управление:** через бэк-офис Fundist (www5.fundist.org → Sorting)
- **Хардкод `topGameCodes` / `providerTier` удалён** — порядок игр полностью определяется бэк-офисом
- **Live Casino:** провайдеры (Evolution, Pragmatic Live и др.) показываются после всех слотов — это единственная клиентская сортировка, оставшаяся в коде
- **Применение:** после изменения порядка в бэк-офисе → `POST /api/slots/catalog/refresh` (сбрасывает RAM-кэш и перезагружает каталог)
- **Файл:** `backend/routes/slotsApi.js`

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
  - Redirect URI: `https://aurex.casino/api/auth/google/callback` + `https://aurex1.casino/api/auth/google/callback`
  - Authorized JavaScript Origins: `https://aurex.casino` + `https://aurex1.casino`
  - Google Cloud проект: "AUREX casino"
  - **Мультидомен:** бэкенд динамически определяет `redirect_uri` из `Origin`/`Referer` заголовка запроса
- **Telegram Login:** виджет + `data-auth-url`
  - Бот: @aurex_support_bot
  - Домены: aurex.casino + aurex1.casino (оба установлены в @BotFather)
  - Endpoint: `GET /api/auth/telegram/callback`
  - **Мультидомен:** бэкенд динамически определяет `frontendUrl` для редиректа после логина
- Соцсети создают пользователя без пароля (password nullable)

### uCaller (верификация телефона)
- **Статус:** Звонки НЕ доходят (РКН заблокировал телефонию uCaller), API отвечает `status: true`, но вызов не приходит
- **Новый аккаунт (20.02.2026):**
  - Service ID: `783837`
  - Secret Key: `XBXMp8mKIDO95bho3Fba7FFnRks1gi3N`
  - Сервис: "Games"
  - Баланс: 500₽
  - Тестовый режим: выключен
- **Старый аккаунт:** заблокирован/не работает
- **Переменные Railway:**
  - `UCALLER_SERVICE_ID` — обновить на `783837`
  - `UCALLER_SECRET_KEY` — обновить на `XBXMp8mKIDO95bho3Fba7FFnRks1gi3N`
- **Файл:** `backend/routes/otp.js`
- **Если не заработает:** переходить на SMS (SMS.ru, SMSC.ru, Messaggio) — нужна замена API в `otp.js`

---

## Бонусная система

### Приветственный пакет (4 депозита) — ПОЛНОСТЬЮ РЕАЛИЗОВАНО

| Депозит | Бонус | Макс. бонус | Вейджер |
|---|---|---|---|
| 1-й | 200% | 70 000 ₽ | x30 |
| 2-й | 150% | 50 000 ₽ | x30 |
| 3-й | 100% | 30 000 ₽ | x30 |
| 4-й | 75% | 20 000 ₽ | x30 |

**Механика:**
- Бонус начисляется автоматически при успешном депозите (через вебхук AVE PAY)
- Бонус зачисляется на `bonus_balance` (отдельно от основного баланса)
- Баланс в играх = `balance + bonus_balance` (суммарный)
- При ставке: списывается сначала с `balance`, потом с `bonus_balance`
- Защита от отрицательного `bonus_balance`: `GREATEST(0, bonus_balance - bet)`
- Отыгрыш отслеживается: `wagering_completed` / `wagering_requirement` (в рублях)
- При завершении отыгрыша: `bonus_balance` переводится в `balance`, бонус → `completed`
- Срок действия: 30 дней, истекшие бонусы → `expired` (ежечасная проверка cron)
- Блокировка вывода при активном бонусе с неотыгранным вейджером

**Файлы:**
- `backend/config/bonusConfig.js` — конфиг DEPOSIT_BONUSES, trackDepositBonusWager(), expireOldBonuses()
- `backend/routes/bonuses.js` — API: active, available, activate, cancel, history
- `backend/routes/gameCallback.js` — вызов trackDepositBonusWager при ставках
- `backend/routes/softgamingsCallback.js` — вызов trackDepositBonusWager при ставках (OneWallet)
- `backend/routes/payments.js` — блокировка вывода при незавершённом вейджере
- `frontend/pages/wallet.tsx` — баннер бонуса, прогресс отыгрыша

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
- Типы: balance (прямое зачисление), bonus, freespins, deposit_bonus
- Управление через админ-панель (`/admin/promocodes`)
- Массовое создание (например, 20 промокодов по 1000₽)
- Каждый промокод — одноразовый на аккаунт (таблица `promocode_usages`)
- **Balance-промокоды:** зачисляются напрямую на `balance` без вейджера
- **Файлы:** `backend/routes/promocodes.js`, `frontend/pages/admin/promocodes.tsx`, `frontend/pages/wallet.tsx`

### Реферальная система
- 5 уровней партнёров (10-20% комиссии от GGR)
- Автоматическая генерация реферального кода
- **Админ-панель рефералов** (`/admin/referrals`): таблица рефереров, детальный просмотр, установка индивидуального процента (`custom_referral_percent`)
- Комиссия считается от **чистого проигрыша** рефералов (ставки - выигрыши), не от депозитов
- Еженедельная обработка (крон, понедельник 00:00)

---

## Структура БД (PostgreSQL)

### Основные таблицы
- `users` — пользователи (balance, bonus_balance, currency, deposit_count, google_id, telegram_id, is_admin)
- `transactions` — все транзакции (type, status, amount, payment_method, avepay_id, avepay_redirect_url)
- `bonuses` — бонусы (user_id, bonus_type, status, bonus_amount, wagering_requirement, wagering_completed, expires_at, updated_at)
- `game_sessions` — игровые сессии (user_id, game_id, session_id, provider, currency, status, bet_amount, win_amount)
- `cashback_records` — кэшбэк
- `loyalty_purchases` — покупки VIP
- `user_boosts` — активные бусты
- `tickets` — тикеты поддержки (включая live_chat из веб-чата, status: open/in_progress/resolved, `assigned_operator_name`, `operator_telegram_id`)
- `ticket_messages` — сообщения в тикетах (sender_type: user/staff/system, sender_name, `file_url`, `file_name`, `file_type`)
- `support_tickets` — тикеты из Telegram-бота (ticket_number, user_telegram_id, user_username, user_first_name, status, subject)
- `support_ticket_messages` — сообщения Telegram-тикетов (ticket_id, sender_telegram_id, **sender_type** (НЕ sender!), **message** (НЕ text!), created_at)
- `promocode_usages` — отслеживание использования промокодов (user_id, promocode_id)
- `promocodes` — промокоды
- `tournaments` — турниры

### ВАЖНО: колонки support_ticket_messages
```
id, ticket_id, sender_telegram_id, sender_type ('user'/'support'), message, created_at
```
**Не перепутать:** поле называется `message` (не `text`), тип отправителя `sender_type` (не `sender`)

### Миграции
- `001_init.sql` — `008_social_auth.sql` (все применены)
- `016_ticket_operator_telegram_id.sql` — колонка `operator_telegram_id BIGINT` в `tickets` (для персистентности оператора)
- `017_ticket_messages_files.sql` — колонки `file_url`, `file_name`, `file_type` в `ticket_messages`, `message DROP NOT NULL`
- `support_ticket_messages` — создана вручную 26.02.2026 для хранения истории Telegram-переписки

---

## API структура

### Backend endpoints
| Путь | Описание |
|---|---|
| `/api/auth/*` | Регистрация, логин, Google, Telegram |
| `/api/slots/games` | Каталог игр (из Fundist) |
| `/api/slots/start-game` | Запуск игры (POST) |
| `/api/slots/game-frame` | Хранение/отдача HTML игры |
| `/api/slots/catalog/refresh` | Сброс кэша каталога (POST) |
| `/api/slots/catalog/status` | Статус кэша каталога (GET) |
| `/api/slots/img` | Прокси картинок игр |
| `/api/callback/softgamings` | OneWallet callbacks |
| `/api/config/*` | Конфигурация (VIP, провайдеры) |
| `/api/users/*` | Профиль, настройки |
| `/api/payments/*` | Депозиты, выводы, AVE PAY / Nirvana Pay / Expay |
| `/api/payments/avepay/callback` | AVE PAY webhook (POST) + health check (GET) + debug/test (admin) |
| `/api/payments/nirvana/callback` | Nirvana Pay callback (GET) — статусы депозитов/выводов |
| `/api/payments/expay/callback` | Expay callback (POST/GET) — статусы депозитов/выводов |
| `/api/bonuses/*` | Бонусы |
| `/api/cashback/*` | Кэшбэк |
| `/api/loyalty/*` | VIP магазин |
| `/api/referral/*` | Реферальная программа |
| `/api/tickets/*` | Тикеты |
| `/api/chat/message` | AI чат Стефани (POST) |
| `/api/chat/ticket` | Live Support: создать тикет из чата (POST, auth) |
| `/api/chat/ticket/:id/messages` | Live Support: polling сообщений (GET, auth) |
| `/api/chat/ticket/:id/message` | Live Support: отправка сообщения оператору + PDF файлов (POST, auth, multipart) |
| `/api/chat/internal/ticket/:id/*` | Internal: reply, reply-file, assign, close (INTERNAL_API_KEY) |
| `/api/admin/*` | Админ-панель |
| `/api/admin/referrals` | Админ: список рефереров, детали, изменение процента (GET/PUT) |
| `/api/admin/support-tickets` | Единый чат: объединённый список Web+Telegram тикетов (GET) |
| `/api/admin/support-tickets/:id/messages` | Сообщения тикета (id = `web_123` или `tg_456`) (GET) |
| `/api/admin/support-tickets/:id/reply` | Ответ в тикет (для TG — шлёт через Telegram Bot API) (POST) |
| `/api/admin/support-tickets/:id/status` | Обновить статус тикета (PATCH) |
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
| `backend/routes/chat.js` | AI чат + Live Support (эскалация к оператору, internal endpoints) |
| `backend/services/telegramNotify.js` | Telegram-уведомления (тикеты, live chat, карточка клиента) |
| `backend/routes/otp.js` | Верификация телефона (uCaller) |
| `backend/middleware/auth.js` | JWT middleware (req.user с balance, currency) |
| `backend/services/nirvanaPayService.js` | Nirvana Pay API (H2H + Payment Form), депозиты/выводы |
| `backend/routes/nirvanaPayCallback.js` | Обработка GET-коллбеков от Nirvana Pay |
| `backend/services/expayService.js` | Expay API (HMAC-SHA512), депозиты (payform) / выводы (P2P) |
| `backend/routes/expayCallback.js` | Обработка POST/GET коллбеков от Expay |
| `backend/constants/fundistMerchants.js` | Маппинг MerchantID → имя провайдера (60+) |

### Frontend
| Файл | Описание |
|---|---|
| `frontend/pages/games/index.tsx` | Страница игр (категории, фильтры, провайдеры) |
| `frontend/components/GameModal.tsx` | Модал запуска игры (iframe + document.write) |
| `frontend/components/GameCard.tsx` | Карточка игры (картинка, RTP, провайдер) |
| `frontend/components/LiveChatWidget.tsx` | Виджет AI чата + Live Support (3 режима: AI/ожидание/оператор) |
| `frontend/pages/wallet.tsx` | Кошелёк: депозит/вывод через AVE PAY + Nirvana Pay + Expay. Крипта скрыта |
| `frontend/pages/aml.tsx` | AML/KYC политика |
| `frontend/store/authStore.ts` | Zustand: авторизация, баланс, валюта |
| `frontend/pages/admin/referrals.tsx` | Админ-панель рефералов (таблица, детали, инд. процент) |
| `frontend/pages/admin/tickets.tsx` | Единый чат поддержки — Web + Telegram тикеты, история, ответы |
| `frontend/pages/admin/index.tsx` | Дашборд — исправлены ссылки, последние транзакции |
| `frontend/pages/admin/transactions.tsx` | Транзакции — серверная фильтрация, URL-параметры, кнопки действий |
| `frontend/components/AdminLayout.tsx` | Layout админки (навигация: Промокоды, Кешбэк, Рефералка) |
| `frontend/components/Header.tsx` | Хедер (мобильное меню вынесено за header для backdrop-filter фикса) |
| `frontend/store/authStore.ts` | Zustand: авторизация, баланс, валюта |
| `frontend/store/settingsStore.ts` | Настройки (язык, валюта отображения) |
| `frontend/next.config.js` | Rewrites (/api + /uploads → backend), headers |
| `frontend/pages/_app.tsx` | Viewport meta (viewport-fit=cover для iOS) |

---

## Telegram бот (@aurex_support_bot)
- AI-ассистент Стефани (OpenRouter API, Claude 3.5 Sonnet)
- Тикет-система с менеджерами (Telegram-тикеты через `support_tickets`)
- **Веб-тикеты из чата сайта** — менеджеры берут и отвечают прямо из Telegram (через `tickets` таблицу)
- Используется для Telegram Login Widget
- Папка: `/telegram-bot/`
- OpenRouter ключ: в `telegram-bot/.env` (OPENROUTER_API_KEY)
- **INTERNAL_API_KEY:** `aurex-internal-key-2026` (для безопасной связи бота с backend API)
- **Backend URL:** `https://aurex-casino-production.up.railway.app` (в `telegram-bot/config.js`)

### ВАЖНО: сохранение сообщений в support_ticket_messages
- Бот **НЕ сохраняет** входящие сообщения в `support_ticket_messages` автоматически (26.02.2026)
- Таблица заполняется только через `POST /api/admin/support-tickets/:id/reply` (ответы админа)
- Пользовательские сообщения в `support_ticket_messages` попали туда через отдельный механизм (не через bot.js)
- **TODO:** добавить в bot.js сохранение входящих сообщений → `INSERT INTO support_ticket_messages (ticket_id, sender_type, message)` при каждом сообщении пользователя в активный тикет
- **Сохранение сообщений:** бот сохраняет входящие сообщения от пользователей в `support_ticket_messages` (sender_type='user')
- **Ответы из веб-админки** → через `POST /api/admin/support-tickets/tg_:id/reply` → Telegram Bot API `sendMessage` → пользователь получает в Telegram

### Веб-тикеты (Live Support из чата сайта)
Менеджеры получают уведомления о запросах оператора из веб-чата и могут:
- **Взять тикет** (`take_web:ID`) — получить карточку клиента (баланс, депозиты, VIP, верификация)
- **Отвечать** — текст менеджера отправляется в backend → пользователь видит в чате на сайте (polling каждые 3 сек)
- **Отправлять файлы** — фото из Telegram скачиваются и загружаются на backend через `/internal/ticket/:id/reply-file`
- **Закрыть тикет** (`close_web:ID`) — тикет закрывается, пользователь получает системное сообщение
- Маршрутизация: `managerWebTickets` Map (отдельно от Telegram `managerReplies`)
- Приоритет: веб-тикет проверяется перед Telegram-тикетом в обработчике сообщений
- **Персистентность:** `operator_telegram_id` сохраняется в БД → при перезапуске бота маппинг восстанавливается через `db.getActiveWebTicketForOperator()`

---

## AI поддержка + Live Support на сайте (LiveChat)

### Статус: РАБОТАЕТ (AI с 20.02.2026, Live Support с 25.02.2026)
- **Персонаж:** Стефани — AI-ассистент AUREX
- **Модель:** Claude 3.5 Sonnet через OpenRouter API
- **Backend:** `backend/routes/chat.js` → AI чат + Live Support endpoints
- **Frontend:** `frontend/components/LiveChatWidget.tsx`
- **Сессии:** in-memory (Map), автоочистка через 30 мин неактивности
- **История:** последние 10 сообщений в контексте
- **Fallback:** если API недоступен — предлагает создать тикет или написать в Telegram
- **Переменная Railway:** `OPENROUTER_API_KEY` — ОБЯЗАТЕЛЬНО добавить!
- **Ключ:** `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`

### Live Support (эскалация к оператору из чата)
**Архитектура:**
```
Пользователь (чат на сайте) → "Позвать оператора" → POST /api/chat/ticket
→ Backend создаёт тикет в `tickets` (category: live_chat) → telegramNotify
→ Менеджеры в Telegram получают карточку клиента + кнопку "Взять"
→ Менеджер берёт тикет → отвечает текстом → ответ сохраняется в `ticket_messages`
→ Пользователь видит ответ через polling (каждые 3 сек)
```

**Режимы чата (frontend):**
| Режим | Описание | Цвет header |
|-------|----------|-------------|
| `ai` | Стефани AI (по умолчанию) | Золотой |
| `waiting` | Ожидание оператора (тикет создан, не взят) | Оранжевый |
| `operator` | Оператор подключён, live-чат | Синий |

**API endpoints (Live Support):**
| Метод | URL | Авторизация | Описание |
|-------|-----|-------------|----------|
| `POST` | `/api/chat/ticket` | JWT (user) | Создать тикет из чата (уведомляет менеджеров) |
| `GET` | `/api/chat/ticket/:id/messages` | JWT (user) | Polling сообщений (?after=timestamp) |
| `POST` | `/api/chat/ticket/:id/message` | JWT (user) | Отправить сообщение оператору |
| `POST` | `/api/chat/internal/ticket/:id/reply` | INTERNAL_API_KEY | Ответ оператора из Telegram |
| `PATCH` | `/api/chat/internal/ticket/:id/assign` | INTERNAL_API_KEY | Оператор берёт тикет |
| `PATCH` | `/api/chat/internal/ticket/:id/close` | INTERNAL_API_KEY | Закрыть тикет |

**Файлы в чате:**
- Пользователь может отправить **PDF** через скрепку в чате → файл загружается на backend (multer → `/uploads/chat/`)
- Оператор получает PDF как документ в Telegram (`sendDocument`)
- Оператор может отправить фото из Telegram → бот скачивает и загружает через `/internal/ticket/:id/reply-file`
- Frontend проксирует `/uploads/:path*` через Next.js rewrite на backend
- **Ограничение:** только PDF (фото-аплоад отключён из-за Safari-бага с `accept="image/*"`)

**Карточка клиента (для менеджеров в Telegram):**
- Логин, Email, Телефон, ID, дата регистрации, верификация
- Баланс, сумма депозитов (кол-во), сумма выводов, VIP-уровень

**Переменные Railway (INTERNAL_API_KEY):**
- `INTERNAL_API_KEY` — `aurex-internal-key-2026` (одинаковый для backend и telegram-bot)
- Используется для защиты internal endpoints от внешнего доступа

**Файлы:**
- `backend/routes/chat.js` — AI чат + Live Support endpoints (user-facing + internal)
- `backend/services/telegramNotify.js` — `notifyNewChatTicket()` + `notifyChatMessage()`
- `frontend/components/LiveChatWidget.tsx` — 3 режима (ai/waiting/operator), polling, стили
- `telegram-bot/bot.js` — `take_web:ID`, `close_web:ID`, reply routing через `managerWebTickets`
- `telegram-bot/config.js` — `backendUrl`, `internalApiKey`

---

## Единый чат поддержки в админке (/admin/tickets)

### Статус: РАБОТАЕТ (26.02.2026)

**Архитектура:**
- Объединяет Web-тикеты (`tickets` таблица) и Telegram-тикеты (`support_tickets` таблица) в одном интерфейсе
- ID тикетов: `web_123` (из `tickets`) или `tg_456` (из `support_tickets`)
- Автообновление списка каждые 15 секунд

**Функциональность:**
- Двухпанельный интерфейс: список тикетов слева, чат справа
- Фильтры: Все / Открытые / Telegram / Сайт / Закрытые
- Поиск по username, ODID/ticket_number, теме
- Отображение количества сообщений у каждого тикета
- Кнопка "Закрыть" для закрытия тикета
- Кнопка "Обновить" + автообновление каждые 15 сек

**Двусторонняя связь:**
- Ответ в Telegram-тикет → `POST /api/telegram.org/bot.../sendMessage` → пользователь получает в Telegram
- Ответ сохраняется в `support_ticket_messages` с `sender_type = 'support'`
- Ответ в Web-тикет → `INSERT INTO ticket_messages (is_staff=true)` → пользователь видит в чате на сайте

**Известные ограничения:**
- Bot.js не сохраняет входящие пользовательские сообщения в `support_ticket_messages` (только первое через create ticket)
- Нет push-уведомлений в браузере (только polling)

**Ключевые файлы:**
- `frontend/pages/admin/tickets.tsx` — полностью переписан (26.02.2026)
- `backend/routes/admin.js` — новые endpoints `/support-tickets/*`
- Таблица `support_ticket_messages` — колонки: `id, ticket_id, sender_telegram_id, sender_type, message, created_at`

**ВАЖНО для разработки:**
```javascript
// Правильные колонки support_ticket_messages:
SELECT sender_type, message FROM support_ticket_messages  // НЕ sender, НЕ text!
INSERT INTO support_ticket_messages (ticket_id, sender_type, message) VALUES (...)
```

**ВАЖНО для frontend useEffect с токеном:**
```javascript
// Всегда добавлять token в deps и проверять его наличие:
useEffect(() => {
  if (!token) return;
  fetchData();
}, [token]); // НЕ [], иначе zustand не успевает hydrate из localStorage
```

---

## AML/KYC политика

### Статус: ОПУБЛИКОВАНА (с 20.02.2026)
- **Страница:** `https://aurex.casino/aml`
- **Файл:** `frontend/pages/aml.tsx`
- **Содержание (10 разделов):**
  1. Введение (FATF, AML/CFT)
  2. KYC процедуры (3 уровня: базовая, расширенная, EDD)
  3. Мониторинг транзакций
  4. Подозрительные транзакции (STR)
  5. Хранение данных (5 лет)
  6. Запрещённые юрисдикции (США, UK, NL, FR, IL)
  7. Крипто-политика
  8. Compliance Officer (MLRO)
  9. Обучение персонала
  10. Санкции за нарушения
- **Ссылка в футере:** исправлена на `/aml` (была `/terms`)

---

## Платёжные системы

### AVE PAY — ОСНОВНАЯ ПЛАТЁЖКА (ПОЛНОСТЬЮ ИНТЕГРИРОВАНА)

**Статус:** Интеграция завершена и ПРОВЕРЕНА. Вебхуки доходят с HMAC-SHA256 верификацией, баланс зачисляется автоматически. Депозиты P2P_CARD/P2P_SBP работают. CRYPTO — отсутствует у провайдера. Выплаты P2P_CARD/P2P_SBP работают (зависят от баланса мерчанта). Бонусная система (x30 вейджер) полностью интегрирована.

**Актуальные лимиты (от ТП AVE PAY):**
- P2P_CARD: мин. 5 000 ₽, макс. 300 000 ₽
- P2P_SBP: мин. 3 000 ₽, макс. 300 000 ₽
- CRYPTO: метод отсутствует, терминал неактивен
- Лимиты могут меняться в течение дня

**Проверка (21.02.2026):**
- Webhook URL доступен: `GET https://aurex.casino/api/payments/avepay/callback` → 200 OK
- Webhook URL напрямую: `GET https://aurex-casino-production.up.railway.app/api/payments/avepay/callback` → 200 OK
- Вебхуки от AVE PAY приходят (DECLINED/CANCELLED статусы обновляются в БД)
- Тестовое зачисление: user PavelAdmin (id=579) баланс 221.30 → 721.30 (+500 ₽) — РАБОТАЕТ
- Бонусная система при депозите: готова (сработает на первом реальном депозите)

**Дашборд:**
```
URL:          https://dashboard.avepay.com
Login:        loanline@mail.ru
Password:     ICNKuzQ4Vuvf
API Key:      XPozUj2CezbUCXz0rS7xVNfFJNCfaQBd
Signing Key:  Ss1C1ibuEHvU
```

**API:**
```
Sandbox:  https://engine-sandbox.avepay.com
Prod:     https://engine.avepay.com
Auth:     Bearer {API_KEY}
Docs:     https://avepay.readme.io/reference
Postman:  https://www.postman.com/avepay/avepay-api-examples-rus/overview
```

**Endpoints:**
| Метод | URL | Описание |
|---|---|---|
| `POST` | `/api/v1/payments` | Создать платеж (DEPOSIT / WITHDRAWAL / REFUND) |
| `GET` | `/api/v1/payments` | Список платежей (offset, limit, created.gte/lt, updated.gte/lt, referenceId.eq) |
| `GET` | `/api/v1/payments/{id}` | Платеж по ID |
| `GET` | `/api/v1/payments/{id}/operations` | Операции по платежу (лог всех шагов) |
| `POST` | `/api/v1/payments/{id}/capture` | Захват preAuth (amount опционально, если не указан — полная сумма) |
| `POST` | `/api/v1/payments/{id}/void` | Отмена preAuth (только AUTHORIZED → CANCELLED) |
| `GET` | `/api/v1/balances` | Балансы мерчанта по валютам |

**Create Payment — ВСЕ параметры:**
| Параметр | Тип | Обязательный | Описание |
|---|---|---|---|
| `referenceId` | string ≤256 | нет | Наш внутренний ID (deposit_{txId}) |
| `paymentType` | enum | **ДА** | DEPOSIT / WITHDRAWAL / REFUND |
| `paymentMethod` | enum | нет | P2P_CARD, P2P_SBP, CRYPTO, BASIC_CARD и 186 др. |
| `amount` | number | нет | 0.00001 — 1,000,000,000 |
| `currency` | string | **ДА** | RUB, USD, EUR, UZS |
| `parentPaymentId` | string ≤32 | нет | ID исходного депозита (для REFUND) |
| `description` | string ≤512 | нет | Описание, видно клиенту |
| `card` | object | нет | **НЕ ОТПРАВЛЯТЬ** (Payment Page, PCI DSS) |
| `customer` | object | нет | Данные клиента (см. ниже) |
| `billingAddress` | object | нет | Адрес клиента |
| `returnUrl` | string | нет | Редирект: `{id}`, `{referenceId}`, `{state}`, `{type}` |
| `webhookUrl` | string | нет | URL для нотификаций |
| `startRecurring` | bool | нет | Начать рекуррентную цепочку |
| `preAuth` | bool | нет | Двухфазный депозит (нужен capture) |
| `recurringToken` | string | нет | Токен для продолжения рекуррента |
| `subscription` | object | нет | Подписка (с startRecurring=true) |
| `additionalParameters` | object | нет | Доп. параметры провайдера |

**customer object — ВСЕ поля:**
| Поле | Тип | Описание |
|---|---|---|
| `referenceId` | string | **ОБЯЗАТЕЛЬНО для P2P!** ID клиента в нашей системе |
| `routingGroup` | string | **ОБЯЗАТЕЛЬНО!** `primary` / `secondary` — маршрутизация трафика. **Используем `secondary`** (как в Postman примерах) |
| `email` | string | Email |
| `phone` | string | Телефон формат: `"7 9081111111"` (пробел между кодом страны и номером!) |
| `firstName` | string | Имя |
| `lastName` | string | Фамилия |
| `locale` | string | Язык: `ru`, `en_US` |
| `citizenshipCountryCode` | string | Страна (AU, RU) |
| `dateOfBirth` | string | Дата рождения (2001-12-03) |
| `accountNumber` | string | Номер счёта (для некоторых выводов) |
| `accountName` | string | Имя счёта |
| `bank` | string | Банк |
| `bankBranch` | string | Отделение банка |
| `bankCode` | string | Код банка: `nspk:100000000111` (Сбербанк), `nspk:100000000004` (Т-Банк), `nspk:100000000005` (ВТБ). **Только для ВЫВОДОВ!** Для депозитов не нужен (подтверждено ТП) |
| `documentType` | enum | Тип документа (BR_CPF и 55 вариантов) |
| `documentNumber` | string | Номер документа |
| `kycStatus` | bool | Прошёл ли KYC |
| `paymentInstrumentKycStatus` | bool | Прошёл ли KYC для карты |
| `dateOfFirstDeposit` | string | Дата первого депозита |
| `depositsAmount` | number | Сумма всех депозитов |
| `withdrawalsAmount` | number | Сумма всех выводов |
| `depositsCnt` | number | Кол-во депозитов |
| `withdrawalsCnt` | number | Кол-во выводов |

**Примеры запросов (из Postman коллекции):**

Депозит P2P_CARD:
```json
{
  "paymentType": "DEPOSIT",
  "paymentMethod": "P2P_CARD",
  "amount": 5000,
  "currency": "RUB",
  "referenceId": "deposit_123",
  "webhookUrl": "https://aurex.casino/api/payments/avepay/callback",
  "returnUrl": "https://aurex.casino/wallet?payment_id={id}&status={state}&type={type}",
  "customer": {
    "referenceId": "user_id_123",
    "routingGroup": "secondary"
  }
}
```

Вывод P2P_CARD (нужен cardNumber!):
```json
{
  "paymentType": "WITHDRAWAL",
  "paymentMethod": "P2P_CARD",
  "amount": 5000,
  "currency": "RUB",
  "referenceId": "withdrawal_123",
  "webhookUrl": "https://aurex.casino/api/payments/avepay/callback",
  "customer": {
    "referenceId": "user_id_123",
    "routingGroup": "secondary"
  },
  "additionalParameters": {
    "cardNumber": "4111111111111111"
  }
}
```

Вывод P2P_SBP (нужен phone и bankCode!):
```json
{
  "paymentType": "WITHDRAWAL",
  "paymentMethod": "P2P_SBP",
  "amount": 5000,
  "currency": "RUB",
  "referenceId": "withdrawal_123",
  "webhookUrl": "https://aurex.casino/api/payments/avepay/callback",
  "customer": {
    "referenceId": "user_id_123",
    "phone": "7 9081111111",
    "bankCode": "nspk:100000000111",
    "routingGroup": "secondary"
  }
}
```

**Payment States (жизненный цикл):**
```
CHECKOUT → PENDING → COMPLETED (успех)
CHECKOUT → PENDING → DECLINED (отказ)
CHECKOUT → CANCELLED (отмена по таймауту / клиентом)
CHECKOUT → PENDING → AUTHORIZED → COMPLETED (preAuth → capture)
CHECKOUT → PENDING → AUTHORIZED → CANCELLED (preAuth → void)
```

**Webhooks:**
- Отправляются при финальном статусе: **COMPLETED**, **DECLINED**, **CANCELLED**
- Можно задать webhookUrl в настройках шопа ИЛИ в createPayment (запрос имеет приоритет)
- Подпись: `Signature` header = HMAC-SHA256(raw JSON body, Signing Key `Ss1C1ibuEHvU`)
- **ВАЖНО:** для подписи использовать raw body строку, НЕ десериализовать+сериализовать обратно
- Payload = формат ответа `GET /api/v1/payments/{id}` (поле `result`)
- **Верификация АКТИВНА:** `backend/routes/avePayCallback.js` проверяет HMAC-SHA256 подпись каждого вебхука

**Test Cards (Sandbox):**
| Карта | Результат |
|---|---|
| 4000 0000 0000 0002 | 3DS, успех |
| 4242 4242 4242 4242 | 3DS, отказ |
| 4000 0000 0000 0408 | Без 3DS, успех |
| 4000 0000 0000 0416 | Без 3DS, отказ |
- Sandbox лимит депозитов: < 10,000,000
- Sandbox лимит выводов/рефандов: 10,000

**Error Codes (полный список):**
| Код | Описание |
|---|---|
| 1.00 | Illegal Workflow State |
| 1.01 | Not Found |
| 1.02 | Communication Problem |
| 1.03 | Internal Server Error |
| 1.04 | Cancelled by Timeout |
| 1.05 | Terminal not Found |
| 1.06 | Recurring Token not Found |
| 1.07 | Payer Unaccepted |
| 1.08 | Invalid Amount |
| 1.09 | Invalid Currency |
| 1.10 | Insufficient Balance (мерчант баланс пуст) |
| 2.00 | Cancelled by Customer |
| 3.00 | Declined by Acquirer |
| 3.01 | Declined by Acquirer: Anti-fraud |
| 3.02 | Declined by Acquirer: Request Validation |
| 3.03 | Acquirer Malfunction |
| 3.04 | Acquirer Timeout |
| 3.05 | Acquirer Limits Reached |
| 3.06 | Declined by Acquirer: Card Scheme |
| 3.07 | Declined by Acquirer: Card Data |
| 3.08 | Declined by Acquirer: Business Rules |
| 3.09 | Not Fully 3DS |
| 4.00 | Declined by Issuer |
| 4.01 | Insufficient Funds |
| 4.02 | Do Not Honor |
| 4.03 | Declined by Issuer: Invalid Card Number |
| 4.04 | Declined by Issuer: Expired Card |
| 4.05 | Issuer Limits Reached |
| 4.06 | Card Lost or Stolen |
| 4.07 | Invalid Security Code |
| 4.08 | Declined by Issuer: Business Rules |
| 5.00 | Declined by 3DS |
| 5.01 | 3DS Timeout |
| 6.00-6.32 | Internal Anti-fraud / Limits |
| 7.00 | Declined by External Anti-fraud |
| 7.01 | External Anti-fraud Communication Problem |

**Переменные Railway:**
- `AVEPAY_API_KEY` — `XPozUj2CezbUCXz0rS7xVNfFJNCfaQBd`
- `AVEPAY_API_URL` — `https://engine.avepay.com` (прод)
- `AVEPAY_WEBHOOK_SECRET` — `Ss1C1ibuEHvU` (Signing Key, HMAC-SHA256 верификация вебхуков)
- `AVEPAY_CALLBACK_URL` — `https://aurex.casino/api/payments/avepay/callback`
  - **Рекомендация:** Для надёжности поставить напрямую на Railway: `https://aurex-casino-production.up.railway.app/api/payments/avepay/callback` (минуя Next.js rewrite)
- `AVEPAY_RETURN_URL` — `https://aurex.casino/wallet`

**Доступные методы оплаты (наши):**
| Метод | Депозит | Вывод | Мин. депозит | Мин. вывод |
|---|---|---|---|---|
| P2P_CARD (Банковская карта) | Работает | Работает (нужен cardNumber) | 5 000 ₽ (макс 300 000) | 1 000 ₽ |
| P2P_SBP (СБП) | Работает | Работает (нужен phone + bankCode) | 3 000 ₽ (макс 300 000) | 1 000 ₽ |
| CRYPTO (Криптовалюта) | **НЕАКТИВЕН** | **НЕАКТИВЕН** | — | — |

**Банки для СБП вывода (передаются в customer.bankCode):**
| Банк | Код |
|---|---|
| Сбербанк | `nspk:100000000111` |
| Т-Банк (Тинькофф) | `nspk:100000000004` |
| ВТБ | `nspk:100000000005` |

**Webhook Debug/Test endpoints (admin only):**
| Метод | URL | Описание |
|---|---|---|
| `GET` | `/api/payments/avepay/callback` | Health check — проверить доступность вебхук-URL |
| `GET` | `/api/payments/avepay/callback/debug` | Показать webhookUrl, pending депозиты, последние транзакции |
| `POST` | `/api/payments/avepay/callback/test` | Ручная симуляция вебхука: `{"transactionId": 123, "action": "complete"}` |

**Ручное зачисление депозита (если вебхук не дошёл):**
```bash
curl -X POST https://aurex.casino/api/payments/avepay/callback/test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {ADMIN_TOKEN}" \
  -d '{"transactionId": 123, "action": "complete"}'
```

**H2H интеграция (без редиректа):**
Для получения реквизитов напрямую без редиректа на страницу AVE PAY:
1. Создаём платёж как обычно (POST /api/v1/payments)
2. Берём `result.id`, игнорируем `redirectUrl`
3. Отправляем `PATCH /api/v1/payments/{id}` с телом `{"customerIp": "IP_клиента"}`
4. В ответе приходят реквизиты в `externalRefs` (номер карты, банк, сумма)

**bankCode — только для выводов:**
Для депозитов bankCode НЕ нужен (подтверждено ТП AVE PAY). Для выводов через СБП:
- Сбербанк: `nspk:100000000111`
- Т-Банк: `nspk:100000000004`
- ВТБ: `nspk:100000000005`

**Все P2P методы AVE PAY:**
P2P_CARD, P2P_SBP, P2P_IBAN, P2P_MOBILE, P2P_M10, P2P_EMANAT, P2P_KAPITAL, P2P_ACCESS, P2P_CROSS_BORDER

**Другие доступные методы (при необходимости):**
SBP (прямой), SBERPAY, BINANCE_PAY, MOBILE_COMMERCE, CRYPTO, BASIC_CARD, APPLEPAY, GOOGLEPAY, PIASTRIX, PERFECTMONEY, MONETIX + 170 других

**BANKTRANSFER (Турция, TRY):**
- Депозит: нужны firstName, lastName, documentNumber
- Вывод: нужен accountNumber (IBAN)

**Subscriptions (рекурренты):**
- `GET /api/v1/subscriptions/{id}` — статус подписки
- `PATCH /api/v1/subscriptions/{id}` — отмена (`{"state": "CANCELLED"}`)

**ВАЖНО (P2P специфика):**
- P2P терминалы работают по пулу карт/номеров — если пул занят, будет `1.05 Terminal not Found`
- Повторный запрос через 30-60 сек обычно проходит
- Для выплат нужен ненулевой баланс мерчанта (пополняется от депозитов)

**Файлы интеграции:**
- `backend/services/avePayService.js` — сервис API (createDeposit, createWithdrawal, confirmPaymentH2H, capturePayment, voidPayment, listPayments, getBalances, getSubscription, cancelSubscription, formatPhone, verifyWebhookSignature)
- `backend/routes/avePayCallback.js` — вебхук обработчик + debug/test endpoints
- `backend/routes/payments.js` — роуты /deposit и /withdraw (с cardNumber/phone/bankCode для выводов, блокировка вывода при активном вейджере)
- `backend/routes/bonuses.js` — бонусы: active, available, activate, cancel, update-wager, admin
- `backend/config/bonusConfig.js` — единый конфиг бонусов (x30 вейджер), trackDepositBonusWager(), expireOldBonuses()
- `backend/routes/config.js` — конфигурация методов оплаты + список банков для фронтенда
- `frontend/pages/wallet.tsx` — кошелёк: депозит/вывод, ввод карты/телефона, бонусный баннер
- `frontend/components/ActiveBonusWidget.tsx` — виджет активных бонусов с прогрессом отыгрыша

**Полный цикл оплаты (flow):**
```
1. Пользователь выбирает метод + сумму на /wallet, видит доступный бонус
2. Frontend → POST /api/payments/deposit (amount, paymentMethod, currency)
3. Backend создаёт transaction (status: pending) в PostgreSQL
4. Backend → POST engine.avepay.com/api/v1/payments (с customer.referenceId, routingGroup, phone для SBP)
5. AVE PAY возвращает redirectUrl → Frontend делает window.location.href = redirectUrl
6. Пользователь оплачивает на странице AVE PAY
7. AVE PAY → POST /api/payments/avepay/callback (webhook с Signature header)
8. Backend: верифицирует HMAC-SHA256 подпись, обновляет transaction → completed
9. Backend: зачисляет balance, начисляет бонус (bonus_balance + wagering_requirement)
10. Пользователь возвращается на /wallet — видит новый баланс + прогресс отыгрыша
```

**Вывод средств (flow):**
```
1. Пользователь выбирает метод + вводит реквизиты (карта/телефон+банк/кошелёк)
2. Frontend → POST /api/payments/withdraw (amount, paymentMethod, cardNumber/phone/bankCode)
3. Backend: проверяет активный бонус → если вейджер не отыгран, блокирует вывод (400)
4. Backend: проверяет баланс → списывает → создаёт transaction (pending)
5. Backend → POST engine.avepay.com/api/v1/payments (WITHDRAWAL, с additionalParameters.cardNumber или customer.phone)
6. AVE PAY обрабатывает выплату (нужен ненулевой баланс мерчанта)
7. AVE PAY → POST webhook (COMPLETED или DECLINED)
8. Если DECLINED → возврат средств на баланс пользователя
```

### Nirvana Pay — ВТОРОЙ ПРОВАЙДЕР (ИНТЕГРИРОВАН)

**Статус:** Интегрирован. Депозиты и выводы через H2H API. Payment Form API (f.nirvanapay.pro) НЕ активирована для текущего аккаунта. 11 платёжных методов для России. **Лимиты на аккаунте = 0 — нужно настроить в ЛК Nirvana Pay!**

**API Credentials:**
```
Public Key:   00cb61a2-3b3f-4b70-b2df-efe1487e15fe
Private Key:  ad9174c6-db56-476f-ad82-4a200f3ea14e
```
- Авторизация: заголовки `ApiPublic` + `ApiPrivate` (разные ключи!)
- Старый ключ `7EbCK8H4g7rZvAT9cqmA` — **НЕ работает**, заменён

**API Endpoints:**
| API | URL | Назначение | Статус |
|---|---|---|---|
| H2H API | `https://api.nirvanapay.pro` | Депозиты + выводы + статус | **РАБОТАЕТ** |
| Payment Form API | `https://f.nirvanapay.pro/api/v2/order` | Депозиты (redirect) | **НЕ АКТИВИРОВАНА** (incorrect keys) |

**Документация:**
- Payment Form: https://f.nirvanapay.pro/read/documentation
- H2H API: https://gitlab.com/NirvanaPayPlatform/doc

**Callback URL:** `https://aurex-casino-production.up.railway.app/api/payments/nirvana/callback`
- Метод: `GET` (Nirvana шлёт GET-запрос при изменении статуса)
- Параметр `txId` передаётся в URL при создании ордера

**Доступные методы оплаты:**

| ID метода | Название | Депозит | Вывод | Мин. деп. | Макс. деп. | Комиссия деп. | Комиссия выв. |
|---|---|---|---|---|---|---|---|
| NIRVANA_SBP | СБП | да | да | 100 ₽ | 100 000 ₽ | 13-22% | 5% |
| NIRVANA_C2C | Карта C2C | да | да | 100 ₽ | 100 000 ₽ | 13-22% | 5% |
| NIRVANA_NSPK | НСПК QR | да | нет | 50 ₽ | 150 000 ₽ | 20% | — |
| NIRVANA_SBER | Сбербанк | да | да | 1 000 ₽ | 50 000 ₽ | 13% | 5% |
| NIRVANA_ALFA | Альфа-Банк | да | да | 1 000 ₽ | 50 000 ₽ | 13% | 5% |
| NIRVANA_VTB | ВТБ | да | да | 1 000 ₽ | 50 000 ₽ | 13% | 5% |
| NIRVANA_SBER_SBP | Сбер СБП | да | да | 100 ₽ | 100 000 ₽ | 13% | 5% |
| NIRVANA_ALFA_SBP | Альфа СБП | да | да | 100 ₽ | 100 000 ₽ | 13% | 5% |
| NIRVANA_VTB_SBP | ВТБ СБП | да | да | 100 ₽ | 100 000 ₽ | 13% | 5% |

**Token маппинг (для H2H API):**
| Метод | token |
|---|---|
| NIRVANA_SBP | СБП |
| NIRVANA_C2C | Межбанк |
| NIRVANA_NSPK | НСПК |
| NIRVANA_SBER | Сбербанк |
| NIRVANA_SBER_SBP | СБЕР СБП |
| NIRVANA_ALFA | Альфабанк |
| NIRVANA_ALFA_SBP | Альфа СБП |
| NIRVANA_VTB | ВТБ |
| NIRVANA_VTB_SBP | ВТБ СБП |
| NIRVANA_TRANS_SBP | ТрансСБП |
| NIRVANA_TRANS_C2C | ТрансМежбанк |

**Все доступные токены по странам:**
```
Россия (RUB):  Межбанк, СБП, ТрансМежбанк, ТрансСБП, НСПК, Яндекс Чаевые, ВТБ, ВТБ СБП, Альфабанк, Альфа СБП, Сбербанк, СБЕР СБП
Узбекистан (UZS): Humo UZS, UZ Card, HumoVisa, HumoMastercard, UzcardVisa, UzcardMastercard
Казахстан (KZT): ForteBank, Altyn Bank, Halyk Bank
Азербайджан (AZN): AZN, Mpay, LeoBank, M10, Kapital Bank, ABB
Турция (TRY): Enpara, Garanti, TRY, Ecom TRY, Payfix, iBan, Ininal, Ziraat Bank, Kuveyt, Papara
Таджикистан (TJS): Алиф Банк, Спитамен Банк, Душанбе Сити Банк
Абхазия (ARUB): Сбербанк Абхазии, А-мобаил
```

**Депозиты (H2H API — текущий flow):**
```
1. Backend создаёт transaction (pending) в PostgreSQL
2. POST https://api.nirvanapay.pro/create/in
   Headers: ApiPublic + ApiPrivate
   Body: { clientID, amount, token, currency, callbackUrl, userInfo }
3. Nirvana возвращает receiver (карта/телефон), bankName, recipientName
4. Frontend показывает реквизиты пользователю с кнопкой копирования
5. Пользователь переводит вручную
6. Nirvana → GET /api/payments/nirvana/callback?txId=XX&type=deposit
7. Backend проверяет статус через getStatus(clientID)
8. SUCCESS → зачисление баланса + бонус
```

**Выводы (H2H API):**
```
1. Backend создаёт transaction (pending), списывает баланс
2. POST https://api.nirvanapay.pro/create/out
   Headers: ApiPublic + ApiPrivate
   Body: { clientID, amount, token, currency, receiver, extra: { bankName, recipientName }, callbackUrl }
   receiver = номер карты (для C2C/внутрибанк) или телефон (для СБП)
3. Nirvana обрабатывает выплату
4. Nirvana → GET /api/payments/nirvana/callback?txId=XX&type=withdrawal
5. Backend проверяет статус → SUCCESS/ERROR
```

**Баланс мерчанта (проверено 24.02.2026):**
```
USDT: 0 (available), 0 (frozen)
```

**Переменные Railway:**
- `NIRVANAPAY_PUBLIC_KEY` — `00cb61a2-3b3f-4b70-b2df-efe1487e15fe` (захардкожен в config.js как дефолт)
- `NIRVANAPAY_PRIVATE_KEY` — `ad9174c6-db56-476f-ad82-4a200f3ea14e` (захардкожен в config.js как дефолт)
- `NIRVANAPAY_API_URL` — `https://api.nirvanapay.pro` (дефолт)
- `NIRVANAPAY_CALLBACK_URL` — `https://aurex-casino-production.up.railway.app/api/payments/nirvana/callback` (дефолт)

**Известные проблемы (24.02.2026):**
1. **Лимиты = 0** — H2H API отвечает `"максимальный лимит по клиенту [0]"`. Нужно настроить в ЛК Nirvana
2. **Payment Form API не работает** — ключи не принимаются, нужно запросить активацию у Nirvana
3. **Баланс 0 USDT** — нужно пополнить для выводов

**Файлы интеграции:**
- `backend/services/nirvanaPayService.js` — API клиенты (apiClient + formClient), createDepositH2H, createDepositForm, createWithdrawal, getStatus, getOrderStatus, getToken
- `backend/routes/nirvanaPayCallback.js` — обработка GET-коллбеков от Nirvana
- `backend/routes/payments.js` — маршрутизация депозитов/выводов между AVE PAY и Nirvana
- `backend/routes/config.js` — конфигурация методов оплаты (fiat массив с обоими провайдерами)

**Иконки платёжных методов:**
| Файл | Источник |
|---|---|
| `/images/payments/sbp.svg` | Кастомный SVG |
| `/images/payments/card.png` | Visa/MC/MIR (от пользователя) |
| `/images/payments/nspk.jpg` | Официальный лого НСПК (от пользователя) |
| `/images/payments/sber.svg` | Официальный SVG Сбербанка (logo-teka.com) |
| `/images/payments/alfa.svg` | Официальный SVG Альфа-Банка (logo-teka.com) |
| `/images/payments/vtb.svg` | Официальный SVG ВТБ (logo-teka.com) |
| `/images/payments/tbank.svg` | Кастомный SVG Т-Банк |

**Порядок отображения на фронтенде:**
1. AVE PAY методы (СБП, Карта) — выше, т.к. комиссия ниже для больших сумм
2. Expay методы (СБП, Карта, Сбербанк, НСПК) — от 500₽, payform redirect
3. Nirvana Pay методы — от 50-100₽, H2H (реквизиты)

---

### Expay — ТРЕТИЙ ПРОВАЙДЕР (ИНТЕГРИРОВАН)

**Статус:** Интегрирован. Депозиты через P2P payform (redirect), выводы через P2P API. HMAC-SHA512 подпись запросов.

**API Credentials:**
```
Public Key:   t5u0ia4gxxrtalfmml3qhv3qs63174iuysm6fxiszfaf9g07s1vlvr2648ndvzjc
Private Key:  7t05s96sl4ithqxhvfxj4gkmu97d29gk44vmzfoptaoaom7ti5oeo5gzlnq18ey19uiaqdaha5s554bp5fmgnmx1xob6vin0ncm73f4xfn13z5anqh5qht23qvdnnsxw
```

**API Base URL:** `https://apiv2.expay.cash`
**Документация:** https://docs.expay.cash/

**Авторизация:** HMAC-SHA512 подпись
- Заголовки: `ApiPublic`, `Signature`, `Timestamp`
- Signature = HMAC-SHA512(privateKey, string(Timestamp) + string(RequestBody))

**Callback URL:** `https://aurex-casino-production.up.railway.app/api/payments/expay/callback`
- Метод: POST и GET (Expay шлёт оба)
- Trusted IPs: 68.183.213.224, 157.245.17.198, 165.227.159.246
- Body: `{ "tracker_id": "...", "client_transaction_id": "..." }`

**Доступные методы оплаты (RUB):**

**Депозиты (pay-in):**

| ID метода | Название | Token | Sub-token | Мин. | Макс. |
|---|---|---|---|---|---|
| EXPAY_SBP | СБП | CARDRUBP2P | SBPRUB | 500 ₽ | 300 000 ₽ |
| EXPAY_CARD | Карта | CARDRUBP2P | CARDRUB | 500 ₽ | 300 000 ₽ |
| EXPAY_SBER | Сбербанк | **RUBCISP2P** | **SBERCISP2P** | 500 ₽ | 300 000 ₽ |
| EXPAY_NSPK | НСПК QR | CARDRUBP2P | NSPKRUB | 500 ₽ | 300 000 ₽ |

**Выводы (pay-out):**

| ID метода | Название | Token | Sub-token | Receiver |
|---|---|---|---|---|
| EXPAY_SBP | СБП | CARDRUBP2P | **SBRRUB** | Телефон |
| EXPAY_CARD | Карта (другие банки) | CARDRUBP2P | **INTERBANKRUB** | Номер карты |
| EXPAY_SBER | Сбербанк | CARDRUBP2P | SBERRUB | Номер карты |

**Endpoints:**
| Метод | URL | Описание |
|---|---|---|
| `POST` | `/api/transaction/create/in` | Создать депозит (payform redirect) |
| `POST` | `/api/transaction/create/out` | Создать вывод (P2P) |
| `POST` | `/api/transaction/get` | Статус транзакции (по tracker_id или client_transaction_id) |
| `POST` | `/api/token/balance` | Баланс по токену |

**Депозиты (payform flow):**
```
1. Backend создаёт transaction (pending) в PostgreSQL
2. POST https://apiv2.expay.cash/api/transaction/create/in
   refer_type: "p2p_payform", token: "CARDRUBP2P", sub_token: "SBERRUB"/"SBPRUB"/etc.
3. Expay возвращает alter_refer (URL формы оплаты)
4. Frontend делает redirect на payform URL (как AVE PAY)
5. Пользователь оплачивает на странице Expay
6. Expay → POST/GET /api/payments/expay/callback
7. Backend запрашивает статус через /api/transaction/get
8. SUCCESS → зачисление баланса + бонус
```

**Выводы (P2P API):**
```
1. Backend создаёт transaction (pending), списывает баланс
2. POST https://apiv2.expay.cash/api/transaction/create/out
   token: "CARDRUBP2P", sub_token: "SBERRUB", receiver: "4111111111111111"
3. Expay обрабатывает выплату
4. Expay → POST/GET callback
5. SUCCESS → завершение, ERROR → возврат средств
```

**Статусы транзакций:**
| Статус | Описание |
|---|---|
| ACCEPTED | Транзакция принята |
| SUCCESS | Транзакция завершена успешно |
| ERROR | Транзакция отменена/истекла |

**Баланс (проверено 10.02.2026):**
```
CARDRUBP2P: 0 (value)
```

**Переменные Railway:**
- `EXPAY_PUBLIC_KEY` — `t5u0ia4gxxrtalfmml3qhv3qs63174iuysm6fxiszfaf9g07s1vlvr2648ndvzjc`
- `EXPAY_PRIVATE_KEY` — `7t05s96sl4ithqxhvfxj4gkmu97d29gk44vmzfoptaoaom7ti5oeo5gzlnq18ey19uiaqdaha5s554bp5fmgnmx1xob6vin0ncm73f4xfn13z5anqh5qht23qvdnnsxw`
- `EXPAY_API_URL` — `https://apiv2.expay.cash` (дефолт)
- `EXPAY_CALLBACK_URL` — `https://aurex-casino-production.up.railway.app/api/payments/expay/callback` (дефолт)

**Файлы интеграции:**
- `backend/services/expayService.js` — HMAC-SHA512 подпись, createDeposit (payform), createWithdrawal, getTransactionInfo, getBalance
- `backend/routes/expayCallback.js` — обработка POST/GET коллбеков от Expay
- `backend/routes/payments.js` — маршрутизация депозитов/выводов между AVE PAY, Nirvana и Expay
- `backend/routes/config.js` — конфигурация методов оплаты (fiat массив с тремя провайдерами)
- `backend/config/config.js` — ключи и URL Expay

---

### SoftGamings (Moneygrator) — резерв
- Setup: EUR 3,000
- Комиссия: EUR 0.01/транзакция
- Абонплата: €2,000/мес если оборот < €50K/мес (со 2-го месяца)
- **Требует юрлицо**

### SoftGamings (Касса — отдельный менеджер KP) — резерв
- SBP/P2P ввод: ~12-13%, вывод ~4%
- Крипта: Deposit 0.8%, Swap 0.2%, Withdrawal 0.5%, Settlement to fiat 1%

### Piastrix — резерв
- Электронный кошелёк, переговоры велись

---

## Агрегаторы игр (история)

### SoftGamings — ВЫБРАН
- Fundist API интеграция завершена (тестовая среда)
- OneWallet протокол реализован
- Каталог: 9,284 игр, 83 провайдера (slots: 8391, live: 486, table: 273, crash: 101, sport: 33)
- Контакт: Даниела (агрегация), KP (платежи)
- Setup fee: убрали (0)
- Вход: €4,000 депозит + €5,000 кредиты (предоплата, пока нет лицензии)
- GGR: от провайдера зависит (EvoPlay 9%, RedTiger 10%, Endorphina 11%)
- При получении лицензии → переход на постоплату
- Могут работать без юрлица и без лицензии

### Slotgrator — переговоры продолжаются
- Депозит $5,000, GGR 11-15%
- Помощь с лицензией Белиз (€1,900/год, 4 недели)
- Помощь с юрлицом
- 200+ провайдеров с лицензией
- Платежи через Moneygrator (отдельный продукт)
- Nolimit City — обещали подключить

### Nuxgame — в рассмотрении
- Депозит $5,000 (вычитается из GGR)
- GGR 7.5-15%
- 140+ провайдеров, 16,000+ игр
- Нет платежей (только агрегация)
- Поддержка русского языка
- Могут без лицензии, нужно юрлицо
- API доки: https://apidoc.fungamess.games/

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

## Безопасность (security hardening — 10.02.2026)

### Закрытые уязвимости:
1. **`/deposit/:id/confirm`** — закрыт за `adminAuth` (ранее любой юзер мог сам подтвердить депозит без оплаты). Основной путь зачисления — через webhook AVE PAY
2. **`/bonuses/update-wager`** — закрыт за `adminAuth` (ранее юзер мог отправить любой amount и мгновенно отыграть вейджер). Реальный трекинг через `trackDepositBonusWager()` в game callbacks
3. **Webhook подпись обязательна** — если нет `Signature` header → 403. Невалидная подпись → 403. Используется `rawBody` (буфер до парсинга JSON) для корректной HMAC-SHA256 верификации
4. **`/api/diag`** — закрыт за `adminAuth` (ранее был публичный, светил IP сервера и маски ключей)
5. **`adminAuth` проверяет `is_active`** — заблокированный админ не пройдёт
6. **Отмена вывода** — `SELECT` перенесён внутрь транзакции с `FOR UPDATE` (ранее race condition мог привести к двойному возврату)
7. **`SELECT *` в auth** — заменён на конкретные поля (пароль не утекает в middleware)
8. **`error.message`** — заменено на generic сообщения (SQL и внутренности не утекают клиенту)
9. **`limit` пагинации** — ограничен max 100 (защита от `limit=999999`)

### Текущие меры:
- `helmet()` — security headers
- `express-rate-limit` — 5000 req/15 min на IP (кроме `/slots/img`, `/slots/games`)
- CORS — только `FRONTEND_URL`
- JWT — 7 дней, проверка `is_active` при каждом запросе
- Webhook HMAC-SHA256 — обязательная подпись
- Database transactions с `FOR UPDATE` — защита от race conditions
- `GREATEST(0, bonus_balance - bet)` — защита от отрицательного бонусного баланса
- `ADMIN_PIN` — доп. защита админ-панели (env var на Railway, rate limit 5 попыток / 15 мин)
- Тестовые/демо аккаунты удалены из seed-скрипта и прод-базы

---

## Чеклист: Что сделано / Что осталось

### Сделано
- [x] Регистрация / авторизация (телефон, Google, Telegram)
- [x] Fundist API интеграция (Game/FullList, User/AuthHTML)
- [x] OneWallet протокол (ping, balance, debit, credit, rollback)
- [x] Каталог игр с картинками (11,000+ игр)
- [x] Сортировка игр через бэк-офис Fundist (topGameCodes удалён из кода)
- [x] Провайдеры маппинг (60+ MerchantID → имена)
- [x] Бонусная система (приветственный пакет, кэшбэк, промокоды)
- [x] VIP система (5 уровней)
- [x] Реферальная программа (GGR-модель, автоначисление по понедельникам, тиры 10-20%, блогерам @pavel_aurex)
- [x] Telegram бот (поддержка + AI)
- [x] Админ-панель
- [x] Мультивалютность (RUB, USD, EUR, UZS)
- [x] AVE PAY — полная интеграция (Payment Page + Webhooks + Выплаты)
- [x] AVE PAY — вебхуки с HMAC-SHA256 верификацией (Signing Key: Ss1C1ibuEHvU)
- [x] AVE PAY — вебхуки работают, баланс зачисляется автоматически (проверено 21.02.2026)
- [x] AVE PAY — выбор банка для СБП выводов (Сбербанк, Т-Банк, ВТБ). bankCode не нужен для депозитов
- [x] AVE PAY — Postman коллекция полностью изучена, код приведён в соответствие (routingGroup: secondary)
- [x] Кошелёк (wallet) — новый UI: выбор метода, ввод карты, телефон+банк для СБП, бонусный баннер
- [x] Бонусная система — приветственный пакет x30 вейджер, отслеживание отыгрыша, блокировка вывода, экспирация 30 дней
- [x] Тестовый webhook endpoint для ручного зачисления (admin)
- [x] AI чат Стефани (Claude 3.5 Sonnet через OpenRouter)
- [x] Live Support — эскалация из AI чата к оператору (кнопка "Позвать оператора")
- [x] Live Support — тикеты из веб-чата приходят в Telegram-бот менеджерам с карточкой клиента
- [x] Live Support — менеджеры берут/отвечают/закрывают тикеты прямо из Telegram
- [x] Live Support — real-time polling (3 сек), 3 режима UI (AI/ожидание/оператор)
- [x] Live Support — internal API endpoints с INTERNAL_API_KEY для безопасной связи бот↔backend
- [x] AML/KYC страница (/aml, 10 разделов)
- [x] Security hardening — 9 уязвимостей закрыто (deposit confirm, update-wager, webhook подпись, diag, adminAuth, race conditions, SELECT *, error leaks, pagination limit)
- [x] Trust meta-теги: JSON-LD (Organization + WebSite), canonical URL, author/publisher/copyright, rating, referrer policy
- [x] Исправлены все OG/Twitter meta URL с aurex.io → aurex.casino
- [x] Политика конфиденциальности (/privacy) — 11 разделов: GDPR, правовые основания, cookies, права пользователей, DPO контакт
- [x] Правила и условия (/terms) — 11 разделов: регистрация, депозиты/выводы, бонусы, честность игр, ответственная игра, запрещённые действия, территориальные ограничения, разрешение споров, интеллектуальная собственность
- [x] Еженедельный кэшбэк — автоматическое начисление каждый понедельник в 00:00 (5-15% от проигрышей, x5 вейджер, мин ₽10)
- [x] Реферальная программа — переделана на GGR-модель (% от дохода казино с рефералов, не от депозитов)
- [x] Реферальная программа — автоначисление GGR-комиссий каждый понедельник
- [x] Реферальная программа — поддержка реферальных кодов при Google/Telegram регистрации (через cookie)
- [x] Реферальная программа — секция для блогеров/стримеров с контактом @pavel_aurex
- [x] Реферальная программа — race-safe claim (FOR UPDATE), parseInt для referrer_id
- [x] Сортировка игр перенесена в бэк-офис Fundist (хардкод topGameCodes / providerTier удалён)
- [x] POST /api/slots/catalog/refresh — принудительный сброс кэша каталога (invalidateCache)
- [x] Фильтрация дублей Plinko — оставлен только от Upgaming, остальные провайдеры отфильтрованы
- [x] cookie-parser подключён к backend (для реферальных cookie при OAuth)
- [x] Nirvana Pay — полная интеграция (Payment Form API для депозитов, H2H API для выводов)
- [x] Nirvana Pay — 11 методов оплаты для России (СБП, C2C, НСПК QR, Сбербанк, Альфа, ВТБ + банк-СБП варианты)
- [x] Nirvana Pay — callback обработчик (GET /api/payments/nirvana/callback)
- [x] Иконки банков — официальные SVG (Сбер, ВТБ, Альфа с logo-teka.com), НСПК (JPG), Карта (PNG с Visa/MC/MIR)
- [x] Кошелёк — object-contain для корректного отображения широких банковских логотипов
- [x] Кошелёк — dropdown банка только для P2P_SBP, не для банк-специфичных методов
- [x] Expay — полная интеграция (HMAC-SHA512, P2P payform для депозитов, P2P API для выводов)
- [x] Expay — 4 метода оплаты для России (СБП, Карта, Сбербанк, НСПК QR)
- [x] Expay — callback обработчик (POST/GET /api/payments/expay/callback)
- [x] Live Support система — эскалация из AI-чата к оператору (25.02.2026)
- [x] Live Support — карточка клиента для менеджеров (баланс, депозиты, VIP, верификация)
- [x] Live Support — кнопки «Взять тикет» / «Закрыть» в Telegram для менеджеров
- [x] Live Support — real-time polling сообщений (каждые 3 сек)
- [x] Live Support — internal API с INTERNAL_API_KEY для связи Telegram-бот ↔ Backend
- [x] Live Support — 3 режима UI в чате (AI/ожидание/оператор) с цветовой индикацией
- [x] Live Support — PDF-файлы в чате (пользователь → оператор в Telegram, оператор → пользователь на сайте)
- [x] Live Support — персистентность оператора через `operator_telegram_id` (переживает перезапуск бота)
- [x] Live Support — отправка файлов из Telegram бота на сайт (`/internal/ticket/:id/reply-file`)
- [x] Google/Telegram Login — мультидоменная поддержка (aurex.casino + aurex1.casino одновременно)
- [x] Админ-панель рефералов (`/admin/referrals`) — таблица рефереров, детальный просмотр, установка индивидуального процента
- [x] Реферальная система — фикс подсчёта рефералов (subqueries вместо JOIN, исправлено раздутие COUNT)
- [x] Реферальная ссылка — мультидоменная (приоритет `x-forwarded-host` → `origin` → `referer` → `aurex1.casino`)
- [x] Промокоды — фикс начисления баланса (убран скрытый вейджер x35 для balance-типа)
- [x] Промокоды — отслеживание использования через `promocode_usages` (1 раз на аккаунт)
- [x] Мобильное меню — фикс гамбургера при скролле (`backdrop-filter` создавал containing block для `fixed`)
- [x] Кешбэк админка — исправлены текст (понедельники, 5-15%, x5 вейджер)
- [x] Next.js rewrite `/uploads/:path*` → backend (для статических файлов чата)
- [x] Платёжки — динамический `returnUrl` из `Origin` заголовка (работает на любом зеркале)
- [x] Все упоминания `aurex.io` заменены на `aurex.casino`
- [x] Тестовые аккаунты (`testuser`, `demo`) удалены из seed-скрипта и прод-базы
- [x] Промокоды — поле вейджера в админке (создание/редактирование), отображение x3/x5/etc в таблице
- [x] Постбэк-трекинг для арбитражников (reg + FTD) — `click_id` из URL → cookie → БД → HTTP GET на trackhta.com
- [x] Чат — загрузка файлов ограничена PDF-only (Safari-баг с `image/*`)
- [x] **Единый чат поддержки в админке** (`/admin/tickets`) — объединяет Web + Telegram тикеты (26.02.2026)
- [x] **Admin tickets** — двусторонняя связь: ответы из веб-интерфейса → Telegram пользователю через Bot API
- [x] **Admin tickets** — история сообщений, автообновление каждые 15 сек, фильтры + поиск
- [x] **support_ticket_messages** — новая таблица для хранения истории Telegram-переписки
- [x] **Wallet — банк для всех СБП** — дропдаун для P2P_SBP, NIRVANA_SBP, EXPAY_SBP (26.02.2026)
- [x] **Банки расширены** — 14 банков с NSPK-кодами в `backend/routes/config.js`
- [x] **Nirvana вывод при одобрении** — admin approve → автоматически вызывает `nirvanaPayService.createWithdrawal` (если нет trackerID)
- [x] **Nirvana вывод ошибка** — при неудаче: статус → failed, баланс возвращается пользователю
- [x] **Промокоды min_deposit** — проверка минимального депозита перед активацией
- [x] **История транзакций пользователя** — только финансовые операции (без игровых ставок/выигрышей)
- [x] **Админ транзакции** — серверная фильтрация, URL query params, фиксированная таблица без overflow
- [x] **Админ дашборд** — исправлены битые ссылки (выводы → `/admin/transactions?type=withdrawal`)

### В процессе
- [x] Переход на продакшн Fundist — **ЛАЙВ! 76 провайдеров активны** (24.02.2026, включая Kiron 974, InOut 816, Endorphina 973)
- [ ] Ожидание активации провайдеров от SoftGamings (в процессе, ~6 шт):
  - PragmaticPlay (960) — ~555 игр
  - PragmaticPlayLive (913) — ~22 игры
  - HacksawGaming (850) — ~215 игр
  - Play'n GO (944) — ~385 игр
  - EvoOSS (892) — ~332 игры (NetEnt/RedTiger bundle)
  - + ещё 1 провайдер
- [ ] Починить uCaller (новый аккаунт) или перейти на SMS (SMS.ru/SMSC.ru/Messaggio)
- [ ] Добавить `OPENROUTER_API_KEY` в Railway env vars бэкенда
- [ ] Настроить `AVEPAY_CALLBACK_URL` на Railway (напрямую на backend URL)
- [x] ~~Сгенерировать Signing Key в AVE PAY дашборде и добавить `AVEPAY_WEBHOOK_SECRET`~~ — ГОТОВО (Ss1C1ibuEHvU)
- [ ] Первый реальный депозит через P2P_CARD (ждём активные P2P-терминалы)

### Потом
- [ ] Юрлицо (Белиз через Slotgrator, €1,900/год, 4 недели)
- [ ] Игровая лицензия (Anjouan: €17,828/год + корп. сервис €6,000 = ~€27,628 первый год)
- [ ] Спортивные ставки (реальные, не виртуальные)
- [ ] Найм саппортов, SMM, аффилиатов, стримеров
- [ ] fail2ban на VPS (боты ломятся 24/7)
- [ ] H2H интеграция AVE PAY (показ реквизитов без редиректа — для лучшего UX)

---

## Промо-материалы
- Google Drive: https://drive.google.com/drive/folders/0BwYUAH58_7YPRWpNVFJRSU5XM1U?resourcekey=0-YCd6ydcrV755OJYSHTEjFA&usp=drive_link
- Также в бэк-офисе Fundist: раздел Client Area

---

## Лицензирование

### Anjouan iGaming License (в рассмотрении)
- **Стоимость 1-й год:** €27,628 (лицензия €17,828 + корп. сервис €6,000 + Costa Rica компания €3,800)
- **Со 2-го года:** €26,428
- **Опционально:** помощь с документами €3,000, ускоренная обработка €11,000, номинальный директор/акционер €16,500 каждый, банковский счёт €3,000
- **Нужные документы:** заверенная копия паспорта, подтверждение адреса, банковское рекомендательное письмо, профессиональное рекомендательное письмо, CV, remote ID verification, декларация источника средств, intake form

### Белиз (через Slotgrator)
- **Стоимость:** €1,900/год
- **Срок:** ~4 недели
- **Нужные документы:** заверенный паспорт, подтверждение адреса, банковское рекомендательное письмо, профессиональное рекомендательное письмо, CV, Police Clearance, Remote ID Verification

---

## Комплаенс-фидбек от провайдеров

### Проблемы (выявлены провайдером, 20.02.2026):
1. **Регистрация через телефон** — звонки uCaller не доходят (РКН блок) → решение: новый аккаунт uCaller или переход на SMS
2. **Кнопка депозита** — **РЕШЕНО (21.02.2026):** AVE PAY полностью интегрирована, вебхуки работают, баланс зачисляется
3. **Тех. поддержка на сайте** — **РЕШЕНО:** AI Стефани + Live Support с эскалацией к оператору (25.02.2026)
4. **AML размытый** → **РЕШЕНО:** создана полная AML/KYC страница `/aml` с 10 разделами

---

## Реферальная программа (подробности)

### Модель: % от GGR (Gross Gaming Revenue)
- Комиссия считается от GGR рефералов (ставки минус выигрыши), НЕ от депозитов
- Автоначисление каждый понедельник в 00:00 (вместе с кэшбэком)
- Минимальная комиссия для начисления: ₽10
- Минимальная сумма для вывода на баланс: ₽100
- Вывод: `referral_earnings` → `balance` (реальный баланс, без вейджера)

### Тиры
| Уровень | Рефералов | Комиссия от GGR | Бонус |
|---------|-----------|-----------------|-------|
| Новичок | 0+ | 10% | — |
| Партнёр | 5+ | 12% | ₽1,000 |
| Эксперт | 15+ | 15% | ₽5,000 |
| Мастер | 30+ | 18% | ₽15,000 |
| Легенда | 50+ | 20% | ₽50,000 |

### Для блогеров/стримеров
- Секция на `/referral` с кнопкой «Написать @pavel_aurex»
- Индивидуальные условия обсуждаются в Telegram

### БД
- `users.referral_code` — VARCHAR(50) UNIQUE, генерируется при регистрации
- `users.referred_by` — VARCHAR(50) — ID реферера
- `users.referral_earnings` — DECIMAL(15,2) — накопленная комиссия
- `users.custom_referral_percent` — DECIMAL(5,2) — индивидуальный процент (NULL = стандартный по тиру)
- `transactions.type = 'referral_commission'` — начисление GGR комиссии
- `transactions.type = 'referral_bonus'` — вывод на баланс

### Файлы
- `backend/routes/referral.js` — stats, list, claim, process-weekly-ggr
- `backend/routes/admin.js` — GET/PUT /api/admin/referrals (список, детали, инд. процент)
- `backend/routes/config.js` — defaultReferralConfig (тиры, bloggerContact)
- `frontend/pages/referral.tsx` — UI реферальной программы
- `frontend/pages/admin/referrals.tsx` — админ-панель рефералов (таблица, поиск, инд. процент)
- `backend/server.js` — автоматическая еженедельная обработка (processWeeklyReferralAuto)

---

### Сортировка игр
- **Управление:** бэк-офис Fundist (www5.fundist.org → Sorting)
- **Хардкод `topGameCodes` / `providerTier` удалён** из `backend/routes/slotsApi.js` (24.02.2026)
- **После изменения порядка:** `POST /api/slots/catalog/refresh` для применения
- **Фильтрация:** дубли Plinko от других провайдеров (Belatra, BetSoft) отфильтрованы на фронте

---

## Постбэк-трекинг (affiliate / арбитраж)

### Статус: РАБОТАЕТ

**Ссылка для трафика:**
```
https://aurex1.casino/?click_id={макрос_трекера}
```
Поддерживаемые параметры: `click_id`, `clickid`, `sub_id`

**Постбэки (trackhta.com):**
| Событие | URL |
|---------|-----|
| Регистрация (reg) | `https://trackhta.com/close/?token={click_id}&advertiserId=360552&label=reg` |
| Первый депозит (FTD) | `https://trackhta.com/close/?token={click_id}&advertiserId=360552` |

**Механика:**
1. Юзер приходит с `?click_id=XXX` → фронтенд сохраняет в cookie (`aurex_click_id`, 30 дней)
2. При регистрации → cookie передаётся на бэкенд → `users.click_id` в БД
3. После создания аккаунта → HTTP GET на reg постбэк (non-blocking)
4. При первом депозите (`deposit_count = 1`) → HTTP GET на FTD постбэк (non-blocking)
5. Дедупликация: флаги `postback_reg_sent` / `postback_ftd_sent` в БД

**БД колонки (миграция 018):**
- `users.click_id` — VARCHAR(500)
- `users.postback_reg_sent` — BOOLEAN DEFAULT FALSE
- `users.postback_ftd_sent` — BOOLEAN DEFAULT FALSE

**Файлы:**
- `backend/services/postbackService.js` — `fireRegPostback()`, `fireFtdPostback()`
- `backend/routes/auth.js` — сохранение click_id, вызов reg постбэка
- `backend/routes/avePayCallback.js` — вызов FTD постбэка
- `frontend/pages/_app.tsx` — захват click_id из URL в cookie
- `frontend/pages/register.tsx` — передача click_id на бэкенд

---

*Последнее обновление: 26 февраля 2026 — единый чат поддержки (Web+Telegram в /admin/tickets), банки для всех СБП методов, Nirvana auto-process при approve, Nirvana error handling (refund), промокоды min_deposit, фильтр истории транзакций, фикс админ дашборда и таблицы транзакций, новая таблица support_ticket_messages*

---

## Исправления 27 февраля 2026

### Рефералы
- **Баг:** `referred_by` в БД — тип `varchar`, а `req.user.id` из JWT — integer. При сравнении в PostgreSQL ошибка `operator does not exist: varchar = integer`. Фикс: везде передаём `String(req.user.id)`.
- **Баг:** Для пользователей с 10+ рефералами список не загружался из-за тяжёлого `LEFT JOIN transactions`. Убрали JOIN, используем готовое поле `total_wagered` из `users`.
- **Бонусы уровней:** Уменьшены в 10 раз (макс. 5000₽ вместо 50000₽). Партнёр: 100₽, Эксперт: 500₽, Мастер: 1500₽, Легенда: 5000₽.
- **Файлы:** `backend/routes/referral.js`, `backend/routes/config.js`

### Верификация документов
- **Баг:** Документы пропадали после перезагрузки — Zustand токен гидрировался с задержкой, страница рисовалась с `isLoading:false` и пустым состоянием до прихода токена.
- **Баг:** В блоке `catch` при ошибке загрузки показывался фейковый toast "успех" и состояние "На проверке". После перезагрузки данных в БД не было.
- **Фикс:** `if (!token) return` в useEffect, убрали fallback "успех" из catch.
- **Файл:** `frontend/pages/verification.tsx`

### Профиль пользователя
- **Баг:** Email нельзя было редактировать — поле захардкожено `disabled`.
- **Баг:** Дата рождения сбрасывалась — PostgreSQL возвращал ISO строку (`1990-01-15T00:00:00.000Z`), а `<input type="date">` ожидает `YYYY-MM-DD`.
- **Фикс:** Email доступен для редактирования, добавлена проверка уникальности. `birthDate` форматируется как `YYYY-MM-DD` в `formatUser`.
- **Файлы:** `frontend/pages/profile.tsx`, `backend/routes/auth.js`

### Чат поддержки (LiveChatWidget)
- **Баг:** Каждое нажатие "Позвать оператора" создавало новый тикет — дубли.
- **Фикс бэкенд:** Перед созданием тикета проверяем существующий открытый тикет (`status IN ('open','in_progress')`). Возвращаем существующий если есть.
- **Новый endpoint:** `GET /api/chat/ticket/active` — проверка активного тикета.
- **Фикс фронтенд:** При открытии виджета автоматически восстанавливаем сессию.
- **Баг:** После ответа оператора юзер не мог написать (режим `waiting`, input заблокирован).
- **Фикс:** При ответе администратора обновляем `assigned_operator_name` и статус → `in_progress`. Polling у юзера получает имя оператора и переключается в режим `operator`.
- **Файлы:** `backend/routes/chat.js`, `backend/routes/admin.js`, `frontend/components/LiveChatWidget.tsx`

### Транзакции (Админ)
- **Баг:** Кнопка "Обновить" сбрасывала поисковый запрос (не передавала `searchTerm`).
- **Баг:** Поиск по `dep_688` (Expay ID) не работал — этот ID генерируется динамически, в БД не хранится. Добавили специальную обработку: `dep_688` → ищем транзакцию с `id=688`.
- **Файлы:** `frontend/pages/admin/transactions.tsx`, `backend/routes/admin.js`

### Важные колонки таблицы `tickets`
```
id, user_id, subject, message, status, priority, category,
assigned_to, assigned_operator_name, operator_telegram_id,
created_at, updated_at
```
- `status`: `open` → ждёт оператора, `in_progress` → оператор подключён, `resolved` → закрыт
- При первом ответе администратора: автоматически `in_progress` + `assigned_operator_name`
