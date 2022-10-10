from pathlib import Path
import sys
from typing import Optional, Type
from loguru import logger
import orjson

TYPE_ALIASES = {"typing.List": "list", "typing.Dict": "dict", "typing.Set": "set"}


def get_classpath(type: Type) -> str:
    if type.__module__ == "builtins":
        return type.__qualname__

    if hasattr(type, "__qualname__"):
        return type.__module__ + "." + type.__qualname__

    # typically a class from the typing module
    if hasattr(type, "_name") and type._name is not None:
        path = type.__module__ + "." + type._name
        if path in TYPE_ALIASES:
            path = TYPE_ALIASES[path]
    elif hasattr(type, "__origin__") and hasattr(type.__origin__, "_name"):
        # found one case which is typing.Union
        path = type.__module__ + "." + type.__origin__._name
    else:
        raise NotImplementedError(type)

    return path


def configure_loguru():
    logger.remove()
    logger.add(
        sys.stderr,
        colorize=True,
        format=_logger_formatter_colorful,
    )


def orjson_dumps(obj, **kwargs):
    return orjson.dumps(obj, default=_orjson_default, **kwargs)


def _logger_formatter_colorful(record):
    clsname = "{extra[cls]}." if "cls" in record["extra"] else ""
    return (
        "<green>{time:YYYY-MM-DD HH:mm:ss.SSS}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>%s{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>\n{exception}"
        % clsname
    )


def _logger_formatter(record):
    clsname = "{extra[cls]}." if "cls" in record["extra"] else ""
    return (
        "{time:YYYY-MM-DD HH:mm:ss.SSS} | {level: <8} | {name}:%s{function}:{line} - {message}\n{exception}"
        % clsname
    )


def _orjson_default(obj):
    if isinstance(obj, Path):
        return str(obj)
    raise TypeError(f"Object of type {obj.__class__.__name__} is not JSON serializable")
