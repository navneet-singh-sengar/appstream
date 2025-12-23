"""
Platform handlers for Flutter build operations.

This module provides platform-specific setup and build handling.
"""

from .base import PlatformHandler
from .android import AndroidHandler
from .ios import IOSHandler
from .web import WebHandler
from .macos import MacOSHandler
from .windows import WindowsHandler
from .linux import LinuxHandler

# Platform registry
_HANDLERS = {
    'android': AndroidHandler,
    'ios': IOSHandler,
    'web': WebHandler,
    'macos': MacOSHandler,
    'windows': WindowsHandler,
    'linux': LinuxHandler,
}


def get_handler(platform, project_root, apps_dir, log_fn):
    """
    Factory function to get the appropriate platform handler.
    
    Args:
        platform: Platform name ('android', 'ios', 'web', etc.)
        project_root: Path to the Flutter project root
        apps_dir: Path to the apps directory for this project
        log_fn: Logging function to use for output
        
    Returns:
        PlatformHandler instance for the specified platform
        
    Raises:
        ValueError: If platform is not supported
    """
    handler_class = _HANDLERS.get(platform)
    if not handler_class:
        raise ValueError(f"Unsupported platform: {platform}")
    
    return handler_class(project_root, apps_dir, log_fn)


def get_supported_platforms():
    """Return list of supported platform names."""
    return list(_HANDLERS.keys())


__all__ = [
    'PlatformHandler',
    'AndroidHandler',
    'IOSHandler',
    'WebHandler',
    'MacOSHandler',
    'WindowsHandler',
    'LinuxHandler',
    'get_handler',
    'get_supported_platforms',
]

