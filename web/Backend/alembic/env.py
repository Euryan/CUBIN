import asyncio
from logging.config import fileConfig
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine
from alembic import context
from app.config import settings
from app.database import Base

config = context.config
fileConfig(config.config_file_name)

config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

target_metadata = Base.metadata


def run_migrations_online() -> None:
    connectable = create_async_engine(settings.DATABASE_URL, poolclass=pool.NullPool)

    def do_run_migrations(sync_conn):
        context.configure(connection=sync_conn, target_metadata=target_metadata)

        with context.begin_transaction():
            context.run_migrations()

    async def run_async():
        async with connectable.connect() as connection:
            await connection.run_sync(do_run_migrations)

    asyncio.run(run_async())


if context.is_offline_mode():
    context.configure(url=settings.DATABASE_URL, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()
else:
    run_migrations_online()
