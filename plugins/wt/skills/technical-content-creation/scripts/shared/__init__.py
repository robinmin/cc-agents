"""Shared utilities for technical-content-creation scripts."""

from .config import (
    get_wt_config,
    get_tcc_config,
    set_tcc_config,
    WTConfigPath,
)

__all__ = [
    "get_wt_config",
    "get_tcc_config",
    "set_tcc_config",
    "WTConfigPath",
]
