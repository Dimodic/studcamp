FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Извлекаем runtime-зависимости из pyproject.toml и ставим. Dev-группа
# ([project.optional-dependencies.dev]) в образ не попадает.
COPY backend/pyproject.toml ./backend/pyproject.toml
RUN python -c "import tomllib; \
deps = tomllib.load(open('backend/pyproject.toml', 'rb'))['project']['dependencies']; \
open('/tmp/reqs.txt', 'w').write('\n'.join(deps))" && \
    pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r /tmp/reqs.txt

COPY backend ./backend

EXPOSE 8000

CMD ["gunicorn", "backend.app.main:app", "-k", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000"]
