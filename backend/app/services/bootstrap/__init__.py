"""Сборка payload для фронтенда.

Пакет разбит на:
  * helpers    — дата/время + CapabilitySchema-константы + UserState dataclass.
  * serializers — функции `_serialize_*` (по сущности на штуку) + подсчёт
                  посещаемости.
  * loaders    — выборка состояния текущего пользователя из БД.
  * build      — `build_bootstrap` — оркестрация всех выборок и сериалайзеров.

Внешний API: `build_bootstrap` (API-роуты) и `_serialize_current_user`
(auth-роут). Всё остальное — деталь реализации.
"""

from .build import build_bootstrap
from .serializers import _serialize_current_user

__all__ = ["_serialize_current_user", "build_bootstrap"]
