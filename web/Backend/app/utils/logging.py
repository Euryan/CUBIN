import logging
from app.config import settings

LOG_FORMAT = "%(asctime)s | %(levelname)s | %(name)s | %(message)s"


def configure_logging() -> None:
    logging.basicConfig(level=settings.LOG_LEVEL, format=LOG_FORMAT)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
