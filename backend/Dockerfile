###############################################################################
# Stage 1: Builder — install dependencies with uv
###############################################################################
FROM python:3.12-slim AS builder

RUN pip install --no-cache-dir uv

WORKDIR /app

COPY pyproject.toml uv.lock* ./
RUN uv pip install --system --no-cache -r pyproject.toml

COPY src/ src/
COPY alembic/ alembic/

###############################################################################
# Stage 2: Runtime — minimal image
###############################################################################
FROM python:3.12-slim AS runtime

RUN groupadd --gid 1000 nexus \
    && useradd --uid 1000 --gid nexus --shell /bin/bash --create-home nexus

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy application code
COPY --from=builder /app/src /app/src
COPY --from=builder /app/alembic /app/alembic
COPY pyproject.toml /app/

ENV PYTHONPATH=/app/src
ENV PYTHONUNBUFFERED=1

USER nexus

EXPOSE 8000

CMD ["uvicorn", "nexus.main:app", "--host", "0.0.0.0", "--port", "8000"]
