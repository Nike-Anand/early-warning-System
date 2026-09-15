"""Create the missing telegram_user_preferences table in the DB so the bot can
reply again. Uses the same DATABASE_URL fallback as the backend code."""
import os
import psycopg2

DSN = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres_secure_password_sih26001@localhost:5432/mdoner_gis",
)

CREATE_SQL = """
CREATE TABLE IF NOT EXISTS telegram_user_preferences (
    chat_id VARCHAR(64) PRIMARY KEY,
    language VARCHAR(8) NOT NULL DEFAULT 'en',
    role VARCHAR(20) NOT NULL DEFAULT 'citizen',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
"""

conn = psycopg2.connect(DSN)
conn.autocommit = True
cur = conn.cursor()
cur.execute(CREATE_SQL)
cur.execute(
    "SELECT to_regclass('public.telegram_user_preferences') IS NOT NULL"
)
print("telegram_user_preferences exists now:", cur.fetchone()[0])
cur.close()
conn.close()