"""Loguru logging configuration."""

import sys

from loguru import logger


def setup_logging(*, json_logs: bool = False) -> None:
    """Configure loguru logging.

    Args:
        json_logs: Use JSON format (for production). Pretty format otherwise.
    """
    logger.remove()

    if json_logs:
        logger.add(
            sys.stdout,
            format="{message}",
            serialize=True,
            level="INFO",
        )
    else:
        logger.add(
            sys.stdout,
            format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
            level="DEBUG",
            colorize=True,
        )
