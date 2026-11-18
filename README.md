# Network HTTP assignment

Небольшой HTTP-сервер на TypeScript без стороннего веб-фреймворка.

## Запуск

```sh
npm install
npm test
npm start
```

Сервер по умолчанию слушает порт `3000`. Другой порт можно задать переменной окружения `PORT`.

## Эндпоинт поиска

### `GET /search?q=node`

- `200 OK` — `{ "q": "node" }`, если `q` передан и содержит символы кроме пробелов.
- `400 Bad Request` — `{ "error": "..." }`, если `q` отсутствует или пуст.
- `404 Not Found` — `{ "error": "Not Found" }` для неизвестного пути.
- `405 Method Not Allowed` — `{ "error": "Method Not Allowed" }` и `Allow: GET`, если метод не `GET`.

Тесты запускаются командой `npm test`.
