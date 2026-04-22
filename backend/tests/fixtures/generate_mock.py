"""Генератор синтетического seed'а для тестов.

Запуск из корня проекта:
    python backend/tests/fixtures/generate_mock.py

Перезаписывает backend/tests/fixtures/mock_snapshot.json. random.seed(42)
обеспечивает детерминированность: одинаковый результат при каждом запуске.

Содержимое:
  - один 12-дневный кемп в «Академгородке»
  - 3 организатора, 6 преподавателей, 30 участников (русские ФИО)
  - 48 занятий (лекции/семинары/питание/работа над проектами/экскурсии)
  - 10 проектов с менторами и командами
  - 4 сторис, 6 орг-обновлений, 20 материалов, 12 ресурсов
  - 6 разделов кампуса, 18 заселений

Тесты опираются только на «якорные» поля:
  * viewer-пользователь test.viewer@camp.local
  * organizer-пользователь organizer.primary@camp.local
  * camp-id camp-mock-2026
  * наличие хотя бы одного completed-event на 2026-04-19 17:30 MSK
"""

from __future__ import annotations

import json
import random
from dataclasses import dataclass
from datetime import date, timedelta
from pathlib import Path

random.seed(42)

CAMP_ID = "camp-mock-2026"
CAMP_START = date(2026, 4, 13)
CAMP_END = date(2026, 4, 24)
TOTAL_DAYS = (CAMP_END - CAMP_START).days + 1

SURNAMES_M = [
    "Абрамов",
    "Агафонов",
    "Алимбеков",
    "Анисимов",
    "Бабаев",
    "Беляев",
    "Васильев",
    "Воронов",
    "Гаврилов",
    "Голубев",
    "Данилов",
    "Дьяков",
    "Егоров",
    "Ермаков",
    "Жуков",
    "Зайцев",
    "Иванов",
    "Казаков",
    "Лебедев",
    "Макаров",
    "Новиков",
    "Орлов",
    "Павлов",
    "Романов",
    "Смирнов",
    "Тарасов",
    "Ушаков",
    "Фёдоров",
    "Хоменко",
    "Цветков",
]
# «Иванов» → «Иванова», «Хоменко» остаётся «Хоменко» (не склоняется).
SURNAMES_F = [
    "Абрамова",
    "Агафонова",
    "Алимбекова",
    "Анисимова",
    "Бабаева",
    "Беляева",
    "Васильева",
    "Воронова",
    "Гаврилова",
    "Голубева",
    "Данилова",
    "Дьякова",
    "Егорова",
    "Ермакова",
    "Жукова",
    "Зайцева",
    "Иванова",
    "Казакова",
    "Лебедева",
    "Макарова",
    "Новикова",
    "Орлова",
    "Павлова",
    "Романова",
    "Смирнова",
    "Тарасова",
    "Ушакова",
    "Фёдорова",
    "Хоменко",
    "Цветкова",
]
FIRST_M = [
    "Александр",
    "Алексей",
    "Андрей",
    "Антон",
    "Артём",
    "Борис",
    "Вадим",
    "Валерий",
    "Виктор",
    "Владимир",
    "Данил",
    "Дмитрий",
    "Евгений",
    "Иван",
    "Игорь",
    "Кирилл",
    "Константин",
    "Леонид",
    "Максим",
    "Михаил",
    "Никита",
    "Николай",
    "Олег",
    "Павел",
    "Пётр",
    "Роман",
    "Сергей",
    "Степан",
    "Фёдор",
    "Юрий",
]
FIRST_F = [
    "Александра",
    "Алина",
    "Алиса",
    "Анастасия",
    "Анна",
    "Валентина",
    "Валерия",
    "Вера",
    "Виктория",
    "Галина",
    "Дарья",
    "Евгения",
    "Екатерина",
    "Елена",
    "Зоя",
    "Ирина",
    "Кристина",
    "Ксения",
    "Лариса",
    "Людмила",
    "Маргарита",
    "Мария",
    "Марина",
    "Надежда",
    "Наталья",
    "Ольга",
    "Светлана",
    "София",
    "Татьяна",
    "Юлия",
]
PATRONYM_M = [
    "Александрович",
    "Алексеевич",
    "Андреевич",
    "Борисович",
    "Вадимович",
    "Викторович",
    "Владимирович",
    "Дмитриевич",
    "Евгеньевич",
    "Иванович",
    "Игоревич",
    "Кириллович",
    "Константинович",
    "Максимович",
    "Михайлович",
    "Николаевич",
    "Олегович",
    "Павлович",
    "Петрович",
    "Романович",
    "Сергеевич",
    "Юрьевич",
]
PATRONYM_F = [
    "Александровна",
    "Алексеевна",
    "Андреевна",
    "Борисовна",
    "Вадимовна",
    "Викторовна",
    "Владимировна",
    "Дмитриевна",
    "Евгеньевна",
    "Ивановна",
    "Игоревна",
    "Кирилловна",
    "Константиновна",
    "Максимовна",
    "Михайловна",
    "Николаевна",
    "Олеговна",
    "Павловна",
    "Петровна",
    "Романовна",
    "Сергеевна",
    "Юрьевна",
]


def _make_fio(gender: str, used: set[str]) -> str:
    """Уникальное русское ФИО."""
    for _ in range(200):
        if gender == "m":
            fio = (
                f"{random.choice(SURNAMES_M)} {random.choice(FIRST_M)} {random.choice(PATRONYM_M)}"
            )
        else:
            fio = (
                f"{random.choice(SURNAMES_F)} {random.choice(FIRST_F)} {random.choice(PATRONYM_F)}"
            )
        if fio not in used:
            used.add(fio)
            return fio
    raise RuntimeError("FIO pool exhausted")


UNIVERSITIES = [
    "НГУ, ФИТ",
    "НГУ, ММФ",
    "МФТИ, ФПМИ",
    "НИУ ВШЭ, ФКН",
    "СПбГУ, матмех",
    "ИТМО, Прикладная математика",
    "МГУ, ВМК",
    "МГТУ им. Баумана",
]

CITIES = [
    "Новосибирск",
    "Москва",
    "Санкт-Петербург",
    "Казань",
    "Екатеринбург",
    "Нижний Новгород",
    "Томск",
    "Красноярск",
]


@dataclass
class User:
    id: str
    name: str
    role: str
    email: str
    university: str | None
    city: str | None
    visibility: str = "name_plus_fields"


def _unique_email(base: str, used: set[str]) -> str:
    if base not in used:
        used.add(base)
        return base
    for i in range(2, 200):
        candidate = base.replace("@", f"{i}@")
        if candidate not in used:
            used.add(candidate)
            return candidate
    raise RuntimeError("email pool exhausted")


def _build_users() -> list[User]:
    users: list[User] = []
    used_fio: set[str] = set()
    used_emails: set[str] = set()

    # якорный organizer для тестов
    users.append(
        User(
            id="organizer-primary",
            name="Захарова Елена Владимировна",
            role="organizer",
            email=_unique_email("organizer.primary@camp.local", used_emails),
            university="Лаборатория Студкемпов",
            city="Новосибирск",
        )
    )
    used_fio.add("Захарова Елена Владимировна")
    # ещё 2 организатора
    for i in range(2):
        gender = random.choice(["m", "f"])
        fio = _make_fio(gender, used_fio)
        surname = fio.split()[0].lower().replace("ё", "e")
        users.append(
            User(
                id=f"organizer-{i + 1}",
                name=fio,
                role="organizer",
                email=_unique_email(f"{surname}.org@camp.local", used_emails),
                university="Лаборатория Студкемпов",
                city=random.choice(CITIES),
            )
        )

    # 6 преподавателей
    for i in range(6):
        gender = random.choice(["m", "f"])
        fio = _make_fio(gender, used_fio)
        first = fio.split()[1].lower().replace("ё", "e")
        surname = fio.split()[0].lower().replace("ё", "e")
        users.append(
            User(
                id=f"teacher-{i + 1}",
                name=fio,
                role="teacher",
                email=_unique_email(f"{first}.{surname}@camp.local", used_emails),
                university=random.choice(UNIVERSITIES),
                city=random.choice(CITIES),
            )
        )

    # якорный viewer-participant
    users.append(
        User(
            id="test-viewer",
            name="Ковалёв Артём Сергеевич",
            role="participant",
            email=_unique_email("test.viewer@camp.local", used_emails),
            university="НГУ, ФИТ",
            city="Новосибирск",
        )
    )
    used_fio.add("Ковалёв Артём Сергеевич")

    # 29 остальных participant'ов
    for i in range(29):
        gender = random.choice(["m", "f"])
        fio = _make_fio(gender, used_fio)
        first = fio.split()[1].lower().replace("ё", "e")
        surname = fio.split()[0].lower().replace("ё", "e")
        users.append(
            User(
                id=f"participant-{i + 1:02d}",
                name=fio,
                role="participant",
                email=_unique_email(f"{first}.{surname}@camp.local", used_emails),
                university=random.choice(UNIVERSITIES),
                city=random.choice(CITIES),
            )
        )
    return users


DAY_TITLES = {
    "1": "Вводный день",
    "2": "День алгоритмов",
    "3": "День машинного обучения",
    "4": "День систем и сетей",
    "5": "День frontend-разработки",
    "6": "День баз данных",
    "7": "День распределённых систем",
    "8": "День embedded и IoT",
    "9": "Работа над проектами",
    "10": "Экскурсионный день",
    "11": "Подготовка защит",
    "12": "Защиты проектов",
}

LECTURE_TITLES_BY_DAY: dict[int, list[tuple[str, str]]] = {
    1: [
        ("Открытие кемпа", "Лекция"),
        ("Знакомство с организаторами", "Знакомство"),
    ],
    2: [
        ("Динамическое программирование на практике", "Лекция"),
        ("Жадные алгоритмы и контрпримеры", "Семинар"),
        ("Сложные структуры данных", "Лекция"),
    ],
    3: [
        ("Классический ML: от линейных моделей до бустингов", "Лекция"),
        ("Нейронные сети с нуля", "Лекция"),
        ("Практика: соревнование на Kaggle", "Практика"),
    ],
    4: [
        ("Системное программирование на C", "Лекция"),
        ("Сети и TCP/IP на пальцах", "Лекция"),
        ("Отладка и профилирование", "Семинар"),
    ],
    5: [
        ("React и современный фронт", "Лекция"),
        ("CSS и вёрстка адаптива", "Семинар"),
        ("Ускорение клиентских приложений", "Практика"),
    ],
    6: [
        ("Реляционные БД и индексы", "Лекция"),
        ("NoSQL: когда и зачем", "Семинар"),
    ],
    7: [
        ("Распределённые транзакции", "Лекция"),
        ("Очереди и event-driven", "Семинар"),
    ],
    8: [
        ("Микроконтроллеры: обзор", "Лекция"),
        ("Пайка и отладка прошивок", "Практика"),
    ],
    9: [
        ("Работа над проектами в лаборатории", "Проект"),
    ],
    10: [
        ("Экскурсия в ИВТ СО РАН", "Экскурсия"),
    ],
    11: [
        ("Подготовка презентаций", "Проект"),
        ("Репетиция защит", "Практика"),
    ],
    12: [
        ("Защиты проектов", "Защита"),
        ("Закрытие кемпа", "Мероприятие"),
    ],
}

MEAL_SLOTS = [("08:30", "09:15", "Завтрак"), ("13:00", "14:00", "Обед"), ("18:30", "19:30", "Ужин")]
LECTURE_SLOTS = [("09:30", "10:50"), ("11:10", "12:30"), ("14:30", "15:50"), ("16:10", "17:30")]

PLACES = [
    ("Аудитория 204", "Корпус ФИТ", "ул. Пирогова, 1"),
    ("Конференц-зал", "Главный корпус", "ул. Пирогова, 2"),
    ("Лаборатория 315", "Корпус ФИТ", "ул. Пирогова, 1"),
    ("Столовая", "Общежитие №5", "ул. Пирогова, 3"),
    ("Большой актовый зал", "Главный корпус", "ул. Пирогова, 2"),
]


def _event_id(seq: int) -> str:
    return f"event-{seq:03d}"


def _build_events(teacher_ids: list[str]) -> list[dict]:
    events: list[dict] = []
    seq = 1
    for day_idx in range(1, TOTAL_DAYS + 1):
        event_date = (CAMP_START + timedelta(days=day_idx - 1)).isoformat()
        # питание
        for start, end, title in MEAL_SLOTS:
            place = random.choice(PLACES)
            events.append(
                {
                    "id": _event_id(seq),
                    "camp_id": CAMP_ID,
                    "event_date": event_date,
                    "title": title,
                    "type": "Питание",
                    "start_at": start,
                    "end_at": end,
                    "place": "Столовая",
                    "building": "Общежитие №5",
                    "address": "ул. Пирогова, 3",
                    "status": "upcoming",
                    "description": None,
                    "materials": None,
                    "day": day_idx,
                    "teacher_ids": [],
                }
            )
            seq += 1
        # лекции
        day_items = LECTURE_TITLES_BY_DAY.get(day_idx, [])
        slots = LECTURE_SLOTS[: len(day_items)]
        for (title, type_), (start, end) in zip(day_items, slots, strict=False):
            place, building, address = random.choice(PLACES)
            assigned_teachers = (
                [random.choice(teacher_ids)] if type_ in {"Лекция", "Семинар", "Практика"} else []
            )
            events.append(
                {
                    "id": _event_id(seq),
                    "camp_id": CAMP_ID,
                    "event_date": event_date,
                    "title": title,
                    "type": type_,
                    "start_at": start,
                    "end_at": end,
                    "place": place,
                    "building": building,
                    "address": address,
                    "status": "upcoming",
                    "description": f"{type_} в рамках дня {day_idx}: {DAY_TITLES.get(str(day_idx))}.",
                    "materials": None,
                    "day": day_idx,
                    "teacher_ids": assigned_teachers,
                }
            )
            seq += 1
    return events


PROJECT_TOPICS = [
    (
        "Синтез речи для офлайн-ассистентов",
        "Speech synthesis / Tacotron / ONNX",
        "Построение TTS-модели, работающей на устройстве без интернета.",
    ),
    (
        "Анализ настроений в соцсетях",
        "NLP / PyTorch / sentiment",
        "Бинарная и тонкая классификация настроений коротких сообщений.",
    ),
    (
        "Веб-сервис прогноза осадков",
        "Backend / FastAPI / geo data",
        "Ежечасный прогноз осадков по координатам с web-UI и публичным API.",
    ),
    (
        "Embedded-датчик качества воздуха",
        "Hardware / STM32 / BLE",
        "Носимый датчик CO₂/PM2.5 с передачей данных по Bluetooth в приложение.",
    ),
    (
        "Визуализация метро в реальном времени",
        "Frontend / WebGL / realtime",
        "Интерактивная карта метро Новосибирска с поездами в реальном времени.",
    ),
    (
        "Поиск по научным статьям",
        "Search / embeddings / vector DB",
        "Семантический поиск по базе препринтов arXiv для студентов матфака.",
    ),
    (
        "Рекомендательная система для студии фильмов",
        "ML / ranking / collaborative filtering",
        "Персональные рекомендации фильмов на основе истории просмотров.",
    ),
    (
        "Распознавание подписей на сканах",
        "Computer vision / OCR",
        "Сегментация подписей на сканах бухгалтерских документов и их валидация.",
    ),
    (
        "Чат-бот для первокурсников",
        "NLP / dialogue / RAG",
        "Ответы на административные вопросы первокурсников с опорой на базу.",
    ),
    (
        "Децентрализованная очередь сборок CI",
        "Distributed systems / queues",
        "Self-hosted CI, распределяющий задачи между внутренними workstation'ами.",
    ),
]


def _build_projects(teacher_ids: list[str], teacher_names: dict[str, str]) -> list[dict]:
    projects = []
    for i, (title, direction, desc) in enumerate(PROJECT_TOPICS):
        mentor_id = teacher_ids[i % len(teacher_ids)]
        mentor_name = teacher_names[mentor_id]
        projects.append(
            {
                "id": f"project-{i + 1:02d}",
                "title": title,
                "short_description": desc[:120],
                "description": desc + " В проекте студенты пройдут полный цикл от идеи до MVP.",
                "direction": direction,
                "min_team": 2,
                "max_team": 5,
                "mentor_name": mentor_name,
                "mentor_position": "Преподаватель кемпа",
                "mentor_city": random.choice(CITIES),
                "mentor_telegram": None,
                "mentor_photo": None,
                "mentor_work_format": random.choice(["офлайн", "гибрид", "онлайн"]),
            }
        )
    return projects


def _build_stories() -> list[dict]:
    return [
        {
            "id": "story-welcome",
            "title": "Добро пожаловать!",
            "type": "info",
            "image": "https://picsum.photos/seed/welcome/800/1200",
            "slides": [
                {
                    "image": "https://picsum.photos/seed/welcome1/800/1200",
                    "text": "Привет! Это кемп — 12 дней интенсива.",
                    "caption": "Начинаем 13 апреля в Новосибирске.",
                },
                {
                    "image": "https://picsum.photos/seed/welcome2/800/1200",
                    "text": "Регистрация открыта с 08:00.",
                    "caption": None,
                },
            ],
        },
        {
            "id": "story-schedule",
            "title": "Как устроено расписание",
            "type": "navigation",
            "image": "https://picsum.photos/seed/schedule/800/1200",
            "slides": [
                {
                    "image": "https://picsum.photos/seed/sched1/800/1200",
                    "text": "Каждый день начинается с общей лекции.",
                    "caption": None,
                },
            ],
        },
        {
            "id": "story-projects",
            "title": "Проекты: что, зачем и с кем",
            "type": "project",
            "image": "https://picsum.photos/seed/projects/800/1200",
            "slides": [
                {
                    "image": "https://picsum.photos/seed/proj1/800/1200",
                    "text": "На кемпе 10 проектов. Выбираешь приоритеты.",
                    "caption": "Команды формируются в первые 3 дня.",
                },
            ],
        },
        {
            "id": "story-safety",
            "title": "Техника безопасности",
            "type": "urgent",
            "image": "https://picsum.photos/seed/safety/800/1200",
            "slides": [
                {
                    "image": "https://picsum.photos/seed/safety1/800/1200",
                    "text": "В лабораториях — только в закрытой обуви.",
                    "caption": None,
                },
            ],
        },
    ]


def _build_org_updates() -> list[dict]:
    return [
        {
            "id": "upd-01",
            "text": "Регистрация продлена до 9:30. Без паники, заходите снизу.",
            "time": "08:45",
            "is_new": True,
            "type": "change",
        },
        {
            "id": "upd-02",
            "text": "Обед в 13:00, кормят по талонам.",
            "time": "12:15",
            "is_new": False,
            "type": "info",
        },
        {
            "id": "upd-03",
            "text": "Wi-Fi Camp-2026 / пароль в профиле.",
            "time": "09:05",
            "is_new": False,
            "type": "info",
        },
        {
            "id": "upd-04",
            "text": "Переезд на автобус к ИВТ — сбор в 13:30 у главного входа.",
            "time": "13:00",
            "is_new": True,
            "type": "urgent",
        },
        {
            "id": "upd-05",
            "text": "Слайды лекций выложены в разделе «Материалы».",
            "time": "18:00",
            "is_new": False,
            "type": "info",
        },
        {
            "id": "upd-06",
            "text": "Завтра аудитория 204 занята — работаем в 315-й.",
            "time": "20:30",
            "is_new": True,
            "type": "change",
        },
    ]


def _build_materials(event_ids: list[str]) -> list[dict]:
    materials = []
    for i in range(20):
        event_id = random.choice(event_ids) if random.random() < 0.7 else None
        type_ = random.choice(["presentation", "recording", "guide", "checklist"])
        materials.append(
            {
                "id": f"material-{i + 1:02d}",
                "title": f"Материал №{i + 1}",
                "type": type_,
                "day": random.randint(1, TOTAL_DAYS),
                "event_id": event_id,
                "topic": None,
                "file_size": f"{random.randint(200, 9000)} КБ",
                "is_new": i < 3,
                "url": f"https://files.camp.local/material-{i + 1}.pdf",
            }
        )
    # пара org-документов
    materials.append(
        {
            "id": "material-org-01",
            "title": "Правила поведения на кемпе",
            "type": "org_doc",
            "day": None,
            "event_id": None,
            "topic": "orientation",
            "file_size": "120 КБ",
            "is_new": False,
            "url": "https://files.camp.local/rules.pdf",
        }
    )
    return materials


def _build_resources() -> list[dict]:
    return [
        {
            "id": "res-schedule",
            "title": "Google-таблица расписания",
            "category": "study",
            "kind": "sheet",
            "description": "Актуальное расписание и изменения, обновляем в течение дня.",
            "url": "https://docs.google.com/spreadsheets/d/mock-schedule",
            "day": None,
            "event_id": None,
            "is_new": False,
        },
        {
            "id": "res-feedback",
            "title": "Форма обратной связи",
            "category": "forms",
            "kind": "form",
            "description": "Оцените лекцию или напишите претензию — анонимно.",
            "url": "https://forms.camp.local/feedback",
            "day": None,
            "event_id": None,
            "is_new": False,
        },
        {
            "id": "res-gallery",
            "title": "Общая галерея",
            "category": "media",
            "kind": "gallery",
            "description": "Фото и видео с лекций и неформальных встреч.",
            "url": "https://photos.camp.local/album-2026",
            "day": None,
            "event_id": None,
            "is_new": False,
        },
        {
            "id": "res-map",
            "title": "Карта кампуса",
            "category": "logistics",
            "kind": "map",
            "description": "Где что находится: общежитие, корпуса, столовая.",
            "url": "https://maps.camp.local/campus",
            "day": None,
            "event_id": None,
            "is_new": False,
        },
        {
            "id": "res-housing",
            "title": "Анкета заселения",
            "category": "housing",
            "kind": "form",
            "description": "Заполните до приезда, иначе без ключа не пустим.",
            "url": "https://forms.camp.local/housing",
            "day": None,
            "event_id": None,
            "is_new": False,
        },
        {
            "id": "res-calendar",
            "title": "iCal-календарь занятий",
            "category": "study",
            "kind": "calendar",
            "description": "Подпишитесь на календарь и получите все занятия в свой тайм-лайн.",
            "url": "https://calendar.camp.local/camp-2026.ics",
            "day": None,
            "event_id": None,
            "is_new": False,
        },
    ]


def _build_campus_categories() -> list[dict]:
    return [
        {
            "id": "cat-wifi",
            "icon": "wifi",
            "title": "Wi-Fi",
            "items": [
                {"title": "Camp-2026 (общий)", "detail": "Пароль в профиле участника"},
                {"title": "Eduroam", "detail": "Работает с учёткой вуза"},
            ],
        },
        {
            "id": "cat-food",
            "icon": "utensils",
            "title": "Питание",
            "items": [
                {"title": "Столовая 08:30–19:30", "detail": "Талоны выдают на регистрации"},
                {"title": "Кофе-станция", "detail": "24/7 на первом этаже общежития"},
            ],
        },
        {
            "id": "cat-laundry",
            "icon": "shirt",
            "title": "Стирка",
            "items": [
                {"title": "Прачечная", "detail": "Общежитие №5, 1 этаж"},
            ],
        },
        {
            "id": "cat-printer",
            "icon": "printer",
            "title": "Принтер",
            "items": [
                {"title": "Корпус ФИТ, ауд. 204", "detail": "Бесплатно, чёрно-белый"},
            ],
        },
        {
            "id": "cat-housing",
            "icon": "bed",
            "title": "Проживание",
            "items": [
                {"title": "Общежитие №5", "detail": "2-3-местные комнаты"},
                {"title": "Заселение с 12:00", "detail": "При наличии паспорта"},
            ],
        },
        {
            "id": "cat-transport",
            "icon": "bus-front",
            "title": "Транспорт",
            "items": [
                {"title": "Шаттл ИВТ ↔ общежитие", "detail": "По вторникам и четвергам"},
                {"title": "Маршрут №8", "detail": "Из центра до ФИТ ~25 минут"},
            ],
        },
    ]


def _build_room_assignments(participants: list[str]) -> list[dict]:
    assignments = []
    # Группируем по 3 в комнату, 6 комнат × 3 = 18 расселений
    rooms = [
        ("305", 3, "Общежитие №5, блок А"),
        ("306", 3, "Общежитие №5, блок А"),
        ("307", 3, "Общежитие №5, блок А"),
        ("401", 4, "Общежитие №5, блок Б"),
        ("402", 4, "Общежитие №5, блок Б"),
        ("403", 4, "Общежитие №5, блок Б"),
    ]
    idx = 0
    for room_no, floor, building in rooms:
        if idx >= len(participants):
            break
        chunk = participants[idx : idx + 3]
        idx += 3
        for user_id in chunk:
            neighbors = [u for u in chunk if u != user_id]
            assignments.append(
                {
                    "user_id": user_id,
                    "number": room_no,
                    "floor": floor,
                    "building": building,
                    "neighbors": neighbors,
                    "key_info": "Ключ — на ресепшене при заселении",
                    "rules": ["Тишина после 23:00", "Курить только на улице"],
                }
            )
    return assignments


def _build_documents(participants: list[str]) -> list[dict]:
    docs = []
    for i, user_id in enumerate(participants[:10]):
        docs.append(
            {
                "id": f"doc-housing-{i + 1}",
                "user_id": user_id,
                "title": "Анкета заселения",
                "description": "Заполните до 12 апреля, иначе заселение будет задержано.",
                "status": "done" if i % 3 == 0 else "in_progress",
                "deadline": "2026-04-12",
                "critical": True,
                "fallback": "camp-docs@camp.local",
            }
        )
        docs.append(
            {
                "id": f"doc-ndis-{i + 1}",
                "user_id": user_id,
                "title": "Согласие на обработку ПДн",
                "description": "Подпишите на стойке регистрации в первый день.",
                "status": "not_started",
                "deadline": None,
                "critical": False,
                "fallback": None,
            }
        )
    return docs


def build_snapshot() -> dict:
    users = _build_users()
    teacher_ids = [u.id for u in users if u.role == "teacher"]
    teacher_names = {u.id: u.name for u in users if u.role == "teacher"}
    participant_ids = [u.id for u in users if u.role == "participant"]

    events = _build_events(teacher_ids)
    event_ids = [e["id"] for e in events]
    projects = _build_projects(teacher_ids, teacher_names)
    materials = _build_materials(event_ids)

    # teacher_assignments (для _seed_user_state: привязывает teacher к 1-2 событиям)
    teacher_assignments: list[dict] = []
    for tid in teacher_ids:
        relevant = [e for e in events if tid in (e.get("teacher_ids") or [])]
        for e in relevant:
            teacher_assignments.append({"teacher_id": tid, "event_id": e["id"]})

    # project_priorities для viewer-участника
    project_priorities = [p["id"] for p in projects[:3]]

    return {
        "meta": {
            "source": "synthetic mock — generated by generate_mock.py",
            "generated_at": "2026-04-22T00:00:00Z",
            "default_demo_password": "studcamp123",
            "viewer_user_id": "test-viewer",
        },
        "camp": {
            "id": CAMP_ID,
            "name": "Сибирский студкемп — весна 2026",
            "short_desc": "Интенсив по разработке и ML для студентов 3-4 курсов",
            "city": "Новосибирск",
            "university": "НГУ · МФТИ · НИУ ВШЭ",
            "start_date": CAMP_START.isoformat(),
            "end_date": CAMP_END.isoformat(),
            "status": "active",
            "current_day": 7,
            "total_days": TOTAL_DAYS,
            "project_selection_phase": "closed",
            "day_titles": DAY_TITLES,
        },
        "users": [
            {
                "id": u.id,
                "camp_id": CAMP_ID,
                "email": u.email,
                "name": u.name,
                "role": u.role,
                "university": u.university,
                "city": u.city,
                "telegram": None,
                "photo_url": None,
                "visibility_mode": u.visibility,
                "notifications_enabled": True,
                "is_active": True,
                "show_in_people": u.id != "test-viewer",
            }
            for u in users
        ],
        "events": events,
        "projects": projects,
        "stories": _build_stories(),
        "org_updates": _build_org_updates(),
        "documents": _build_documents(participant_ids),
        "campus_categories": _build_campus_categories(),
        "room_assignments": _build_room_assignments(participant_ids),
        "materials": materials,
        "resources": _build_resources(),
        "story_reads": [],
        "update_reads": [],
        "attendance": [],
        "project_priorities": project_priorities,
        "teacher_assignments": teacher_assignments,
    }


if __name__ == "__main__":
    out_path = Path(__file__).parent / "mock_snapshot.json"
    snapshot = build_snapshot()
    out_path.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {out_path} — {len(snapshot['users'])} users, {len(snapshot['events'])} events,")
    print(f"      {len(snapshot['projects'])} projects, {len(snapshot['materials'])} materials")
