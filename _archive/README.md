# \_archive

Пустая папка-заглушка. В проекте больше нет «слепков реальных кемпов» —
всё либо минимально (production seed в `backend/seeds/initial_data.json`,
один пустой кемп), либо синтетически сгенерировано (тестовая фикстура в
`backend/tests/fixtures/mock_snapshot.json`, источник — тот же каталог,
файл `generate_mock.py`).

## Если хочешь восстановить богатый dev-кемп (из mock-фикстуры)

```
cp backend/tests/fixtures/mock_snapshot.json backend/seeds/initial_data.json
python -m backend.app.seed_data
```

После этого в dev-БД будет кемп с 39 пользователями, 62 событиями, 10
проектами — для ручного тестирования UI.

## Если не нужно

Эту папку можно удалить целиком:

```
rm -rf _archive/
```

Никакой код на неё не смотрит — её отсутствие ничего не ломает.
