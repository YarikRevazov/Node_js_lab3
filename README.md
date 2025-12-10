# Лабораторная работа №3 — Аутентификация и авторизация (Todo REST API + JWT)

## Цель работы
1. Освоить методы аутентификации (JWT) и авторизации (роли/владение) в backend-приложениях на Node.js.
2. Защитить REST API с помощью JSON Web Token.
3. Разграничить права: admin управляет всем, user — только своими задачами.
4. (Опционально) Подготовить базис для RBAC (Role-Based Access Control).


## Краткое условие
- Добавить сущность users (регистрация/вход, хэш пароля, роли).
- Выдавать JWT при успешном входе.
- Защитить /api/todos и /api/categories с проверкой токена.
- Разграничить права: user — только со своими задачами; admin — полный доступ + управление категориями.
- Все ответы и ошибки — JSON. Документация — Swagger.

### Шаг 1. Структура базы данных
Добавил таблицу users и связь задач с пользователем todos.user_id (FK → users.id, ON DELETE SET NULL).

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

ALTER TABLE todos
  ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_todos_user_id ON todos(user_id);
<img width="1618" height="213" alt="image" src="https://github.com/user-attachments/assets/e96b9fde-9bb8-4d66-8bdd-6849015b3dba" />

### Шаг 2. Реализация аутентификации (Authentication)
Маршруты /api/auth:
- POST `/api/auth/register` — проверка уникальности username/email, хэш пароля через bcrypt, создание пользователя (по умолчанию role=user).
- POST `/api/auth/login` — проверка пары логин/пароль, генерация JWT c полями userId, username, role, срок действия из .env.
- GET `/api/auth/profile` — возвращаю данные текущего пользователя по заголовку Authorization: Bearer <token> (401 если токен отсутствует/невалиден).

Переменные окружения:
JWT_SECRET=super-secret-key
JWT_EXPIRES_IN=1d

### Шаг 3. Реализация авторизации (Authorization)
- authMiddleware — валидирует JWT, при успехе записывает req.user = { userId, username, role }, иначе 401.
- isAdmin — пропускает только role === 'admin' (иначе 403).
- isOwnerOrAdmin(getOwnerId) — разрешает доступ, если текущий пользователь владелец ресурса или админ (иначе 403).
<img width="916" height="1025" alt="image" src="https://github.com/user-attachments/assets/e4fa1158-cc9b-444d-a20f-58ff616c12e4" />

Политики:
- user: может создавать задачи, видеть только свои, менять/удалять только свои.
- admin: полный CRUD по задачам + управление категориями.

Применение:
- Все /api/todos — за токеном (authMiddleware).
- PUT/PATCH/DELETE /api/todos/:id — isOwnerOrAdmin.
- /api/categories — чтение под токеном; POST/PUT/DELETE — только isAdmin.

### Шаг 4. (Доп.) RBAC
Спроектировал таблицы roles, permissions, role_permissions, user_roles. Идея — проверять не только роль, но и конкретные permissions (например, DELETE_CATEGORY).

### Шаг 5. (Альтернатива) Passport.js
Описал возможность перехода на passport + passport-jwt (JwtStrategy) вместо ручного парсинга токена.

### Шаг 6. Проверка и демонстрация (я делал через Postman)
1. Создал двух пользователей: admin@example.com (роль admin) и user@example.com (роль user).
2. Через Postman последовательно выполнил:
   - Register (user): POST /api/auth/register → 201.  
   - Login (user): POST /api/auth/login → 200 + token.  
   - Profile (user): GET /api/auth/profile c Authorization: Bearer <token> → 200.
   - Create todo (user): POST /api/todos c токеном → 201, в ответе user_id = текущий.
   - Delete чужую задачу (user): DELETE /api/todos/:id где задача не моя → 403 Forbidden.
   - Login (admin): POST /api/auth/login → 200 + token.
   - Admin CRUD категорий: POST/PUT/DELETE /api/categories → 201/200/204 (успешно).
   - Admin удаляет любую задачу: DELETE /api/todos/:id → 204.
   - Без токена: любой защищённый маршрут → 401 Unauthorized.
   - <img width="819" height="914" alt="image" src="https://github.com/user-attachments/assets/930abcba-d05d-40b8-983b-d0342e49c8ac" />

<img width="808" height="621" alt="image" src="https://github.com/user-attachments/assets/f3a437a4-f7b5-4859-82fc-4c838a19cdd4" />

<img width="819" height="552" alt="image" src="https://github.com/user-attachments/assets/23c9a0e7-0070-4903-8f69-95054e026861" />

<img width="822" height="545" alt="image" src="https://github.com/user-attachments/assets/c8bacc8a-172b-4975-b5ae-c3b6fd4339f7" />

## Список маршрутов после доработки

### Auth (/api/auth)
| Метод | URL          | Описание                         |
|------:|--------------|----------------------------------|
| POST  | /register  | Регистрация пользователя         |
| POST  | /login     | Вход, выдача JWT                 |
| GET   | /profile   | Профиль по токену                |

### Todos (/api/todos) — требует токен
| Метод  | URL              | Права                             |
|-------:|------------------|-----------------------------------|
| GET    | /              | user: свои, admin: все            |
| GET    | /:id           | владелец или admin                |
| POST   | /              | user/admin (владелец = текущий)   |
| PUT    | /:id           | владелец или admin                |
| PATCH  | /:id/toggle    | владелец или admin                |
| DELETE | /:id           | владелец или admin                |

### Categories (/api/categories) — требует токен
| Метод  | URL              | Права        |
|-------:|------------------|--------------|
| GET    | /              | user/admin   |
| GET    | /:id           | user/admin   |
| POST   | /              | admin    |
| PUT    | /:id           | admin    |
| DELETE | /:id           | admin    |



## Ответы на контрольные вопросы

1) Что такое JWT и как он работает?  
Компактный подписанный токен (header.payload.signature). Сервер выдаёт токен при логине, клиент передаёт его в заголовке Authorization: Bearer. Сервер проверяет подпись и срок (exp) без хранилища сессий. Важно: хранить секрет, задавать разумный TTL, обновлять токены по необходимости.

2) Как реализовать безопасное хранение паролей пользователей?  
Не хранить пароли в явном виде. Использовать bcrypt/argon2 с солью и достаточной сложностью; сравнение делать через bcrypt.compare. Политика крепких паролей, ограничение попыток, HTTPS, защита от утечек.

3) В чём разница между аутентификацией и авторизацией?  
Аутентификация — установление личности (кто я). Авторизация — определение прав (что мне можно). В моём проекте: аутентификация — выдача/проверка JWT, авторизация — проверка роли (admin/user) и владения ресурсом.

4) Преимущества и недостатки Passport.js для аутентификации в Node.js?  
Плюсы: готовые стратегии (JWT, OAuth), единый интерфейс, меньше кода. Минусы: дополнительная абстракция, иногда сложнее тонкая настройка; для простого JWT ручная реализация бывает проще и прозрачнее.



## Вывод
Я реализовал в Todo REST API JWT-аутентификацию, авторизацию по ролям и проверку владельца ресурса. Все кейсы проверил через Postman (скриншоты приложил). Теперь:
- защищённые маршруты доступны только с валидным токеном,
- user работает только со своими задачами,
- admin управляет всеми задачами и категориями,
- база расширена таблицей users и полем todos.user_id.  
Проект соответствует целям ЛР №3 и готов к расширению  (RBAC/Passport.js).
