# \_archive

Пустая папка-заглушка: раньше здесь лежал seed-слепок реального кемпа
«Алиса и умные устройства Яндекса». Он переехал в
`backend/tests/fixtures/alisa_snapshot.json`, чтобы тесты на него
опирались автономно.

## Если хочешь восстановить реальные данные в dev-БД

1. Скопировать фикстуру обратно как production-seed:
   ```
   cp backend/tests/fixtures/alisa_snapshot.json backend/seeds/initial_data.json
   ```
2. Перезапустить seed:
   ```
   python -m backend.app.seed_data
   ```

## Если не нужно

Эту папку можно удалить целиком — никакой код на неё не смотрит:
```
rm -rf _archive/
```
