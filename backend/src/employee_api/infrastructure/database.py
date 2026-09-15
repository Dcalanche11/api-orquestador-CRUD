from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker


class Base(DeclarativeBase):
    pass


def build_session_factory(url: str):
    engine = create_engine(
        url, pool_pre_ping=True, pool_size=5, max_overflow=10, hide_parameters=True
    )
    return sessionmaker(bind=engine, expire_on_commit=False)
