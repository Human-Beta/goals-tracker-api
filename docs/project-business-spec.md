> Legacy monolithic draft. Primary business docs now live in:
> [docs/business-spec/README.md](./business-spec/README.md)

# Goal Tracker MVP — технічна специфікація

## 1) Авторизація/сесії: Telegram бот + сайт (рекомендована схема)

### Як це зазвичай роблять правильно
Користувач напряму **не** ходить у твоє API з Telegram-клієнта.  
Запити в API робить твій **bot-server (backend бота)**. Це і є “сесія”.

**Актори:**
- Telegram User → (чат) → Bot
- Bot server → (HTTP) → Goal Tracker API
- Website (браузер) → (HTTP) → Goal Tracker API

### 2 типи авторизації (MVP)

#### Service auth (для бота)
Goal Tracker API приймає запити лише від твого bot-server по секрету:
- `Authorization: Bearer <BOT_SERVICE_TOKEN>`
- або HMAC-підпис заголовків

У кожному запиті бот передає `telegram_user_id` (і опц. `telegram_username`).  
API довіряє цим даним **лише якщо валідний service token**.

✅ Плюси: дуже простий MVP, не потрібні JWT/refresh для Telegram.  
⚠️ Мінус: цей режим не для браузера напряму.

#### User auth (для сайту)
Класичний JWT (`access_token`, опц. `refresh_token`) або cookie-session.

Спосіб логіну на MVP:
- або `email + password`
- або Telegram Login (пізніше), який лінкує акаунт по `telegram_user_id`

### Рекомендація для MVP
- бот працює через service token
- сайт поки можна відкласти, але структуру `User` робимо одразу, щоб потім підключити web-auth без міграцій

---

## 2) MVP правила (зафіксовані)

### Goal
- `title` — required
- `unit` — required enum: `pages | minutes | km`
- `target_value` — required `> 0`, `decimal(...,2)`
- `start_date` — optional, default = today; можна минуле, не можна майбутнє
- `end_date` — required; строго після today (в таймзоні юзера)
- `status` — `active | completed`
- `unit` не можна змінювати після створення
- `target_value` не можна зменшити нижче поточного прогресу (інакше `409`)

### ProgressEvent
- оновлення прогресу — дельта (`delta_value`)
- `date` — optional, default today; можна минуле, не можна майбутнє
- бажано: `date >= goal.start_date` (інакше юзер має змінити `start_date` раніше)

### Автозавершення
- якщо `sum(progress.delta_value) >= target_value` → `status = completed`

---

## 3) Модель даних (мінімум)

### `users`
- `id` (uuid)
- `timezone` (IANA string, напр. `Europe/Uzhgorod`)
- `telegram_user_id` (bigint, unique, nullable)
- `created_at`

### `goals`
- `id` (uuid)
- `user_id` (fk)
- `title` (text)
- `unit` (enum)
- `target_value` (`numeric(12,2)`)
- `start_date` (date)
- `end_date` (date)
- `status` (enum: `active/completed`)
- `created_at`, `updated_at`

**Індекси:**
- `(user_id, status)`
- `(user_id, end_date)`

### `progress_events`
- `id` (uuid)
- `goal_id` (fk)
- `date` (date)
- `delta_value` (`numeric(12,2)`)
- `note` (text, nullable)
- `created_at`, `updated_at`

**Індекси:**
- `(goal_id, date)`

---

## 4) API (MVP): ендпоінти

### Auth для бота (service)
Всі запити від bot-server:
- `Authorization: Bearer <BOT_SERVICE_TOKEN>`
- `X-Telegram-User-Id: <id>` (або в body)

### Users (мінімально)
#### `POST /bot/users/upsert`
Створює/оновлює юзера по `telegram_user_id`, повертає `user_id`.

```json
{
  "telegram_user_id": 123456,
  "timezone": "Europe/Uzhgorod"
}
```

### Goals
#### `POST /goals`
```json
{
  "title": "Прочитати Clean Code",
  "unit": "pages",
  "target_value": 464,
  "start_date": "2026-02-10",
  "end_date": "2026-03-15"
}
```

#### `GET /goals` (список, коротко)
Повертає:
- `id`
- `title`
- `percent_complete`
- `days_left`
- `pace_current_7d`

#### `GET /goals/{goalId}` (детально)
Повертає всі поля goal + computed (нижче).

#### `PATCH /goals/{goalId}`
Дозволено: `title`, `target_value`, `start_date`, `end_date` (`unit` — ні).  
Валідації: як у правилах.

### Progress
#### `POST /goals/{goalId}/progress` (додати дельту)
```json
{
  "delta_value": 20,
  "date": "2026-02-23",
  "note": "вечір"
}
```

#### `GET /goals/{goalId}/progress?from=YYYY-MM-DD&to=YYYY-MM-DD`
Повертає список events (для “просто історії”).

#### `PATCH /goals/{goalId}/progress/{eventId}` (виправити введене)
```json
{
  "delta_value": 15,
  "date": "2026-02-23",
  "note": "помилився, було 15"
}
```

#### `DELETE /goals/{goalId}/progress/{eventId}` (видалити неправильне)
Це краще, ніж “undo”, бо:
- прозора історія
- можна правити конкретний день
- проста статистика/темпи

---

## 5) Computed поля для `GET /goals/{id}` (і як рахувати)

Нехай:
- `C = sum(delta_value)` (по goal)
- `T = target_value`
- `today` у timezone юзера (`date`)
- `S = start_date`
- `E = end_date`

### Базове
- `current_value = C`
- `remaining_value = max(T - C, 0)`
- `percent_complete = min(100, (C / T) * 100)`

### Дні
- `days_left = max((E - today).days, 0)` (не рахує сьогодні)

Для темпів з урахуванням “можна робити сьогодні”:
- `days_left_for_pace = max((E - today).days + 1, 0)`
- `days_total = (E - S).days + 1`
- `days_elapsed = (today - S).days + 1` (`S` гарантовано не в майбутньому)

### Очікувані темпи
- `pace_expected_per_day = T / days_total`
- `pace_required_per_day = remaining_value / days_left_for_pace` (якщо `days_left_for_pace = 0` → `0`)

### Поточний темп
- `pace_current_7d = sum(delta за останні 7 днів включно з today) / 7`
- `pace_current_30d = sum(delta за останні 30 днів) / 30`
- `pace_current_all = C / days_elapsed`

### Очікувана дата завершення з урахуванням темпу
Візьми як основний темп, напр. `pace_current_7d` (або вибір параметром):
- якщо `pace_current_7d > 0`:
  - `eta_days = ceil(remaining_value / pace_current_7d)`
  - `eta_date = today + eta_days`
- інакше `eta_date = null`

### Відставання від графіку
- `expected_by_today = pace_expected_per_day * days_elapsed`
- `behind_value = expected_by_today - C`
- якщо `behind_value > 0` → “відставання на X unit”
- якщо `< 0` → “випередження на |X| unit”

### Пункт 13: темп, щоб за 7 днів повернутись до плану
- `expected_by_today_plus_7 = pace_expected_per_day * (days_elapsed + 7)`
- `need_next_7_days = max(expected_by_today_plus_7 - C, 0)`
- `catchup_pace_next_7_days = need_next_7_days / 7`

---

## 6) Простий “статистичний” endpoint (як ти описав)

Щоб не вигадувати складні агрегації:
- `GET /goals/{id}/progress` — повертає всі записи прогресу (з дати старту і до today / або з фільтрами)
- (опц.) додати параметр `sort=asc|desc`

Цього достатньо для MVP: ти будуєш графік/таблицю в боті або на сайті з raw-івентів.

---

## Відкладено після MVP (структуровано для нотаток)

- **Нагадування**
  - Моделі reminder’ів (`daily/weekly/every_other_day/custom`)
  - Вибір часу нагадування, каналу (`telegram/push/email`)
  - Планувальник/джобер, збереження “останній раз надіслано”

- **Templates**
  - `template_id` при створенні goal
  - Префікси назв, дефолтні unit, кастомні поля (“розмір книги” тощо)

- **Оптимізація даних**
  - Додати `goals.current_value` як кеш (денормалізація)
  - Тригер/джоба для підтримки кеша при `INSERT/UPDATE/DELETE progress_events`

- **Розширені стани цілей**
  - `paused`, `canceled`, `archived`
  - Ручне завершення/повторне відкриття

- **Редагування правил**
  - Можливість змінювати unit з міграцією подій (або конверсією)
  - Конверсії (`minutes↔hours`, `km↔m`, `pages` тільки int тощо)

- **Статистика/агрегації**
  - Ендпоінти типу `/stats?range=week|month|quarter|year&group_by=day|week|month`
  - “Тиждень з понеділка” в агрегації
  - Кешування статистики
