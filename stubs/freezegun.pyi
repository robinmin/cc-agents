"""Type stubs for freezegun."""
from contextlib import contextmanager
from datetime import date, datetime
from typing import Generator, Union, Optional

@contextmanager
def freeze_time(
    freeze_time: Union[str, datetime, date, None] = None,
    tz_offset: Optional[int] = None,
    as_arg: Optional[bool] = None,
    as_kwarg: Optional[str] = None,
    ignore: Optional[list] = None,
    auto_tick_seconds: Optional[int] = None,
) -> Generator[None, None, None]: ...
