"""
Base platform handler for Flutter build operations.

Defines the abstract interface that all platform handlers must implement.
"""

import shutil
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Callable, Optional


class PlatformHandler(ABC):
    """
    Abstract base class for platform-specific build setup.
    
    Each platform (Android, iOS, Web, etc.) implements this interface
    to provide platform-specific configuration and build handling.
    """
    
    # Platform identifier (e.g., 'android', 'ios', 'web')
    platform: str = ""
    
    def __init__(self, project_root: Path, apps_dir: Path, log_fn: Callable):
        """
        Initialize the platform handler.
        
        Args:
            project_root: Path to the Flutter project root directory
            apps_dir: Path to the apps directory for storing app-specific assets
            log_fn: Callable for logging messages (build_id, message, level)
        """
        self.project_root = project_root
        self.apps_dir = apps_dir
        self._log_fn = log_fn
        self._build_id: Optional[str] = None
    
    def set_build_id(self, build_id: str) -> None:
        """Set the current build ID for logging."""
        self._build_id = build_id
    
    def log(self, message: str, level: str = "info") -> None:
        """
        Log a message with the current build ID.
        
        Args:
            message: The message to log
            level: Log level ('info', 'success', 'warning', 'error', 'terminal')
        """
        if self._build_id and self._log_fn:
            self._log_fn(self._build_id, message, level)
    
    @abstractmethod
    def setup(self, app_id: str, app_config: dict, flavor: Optional[str] = None) -> None:
        """
        Apply platform-specific configuration before build.
        
        This method is called before the Flutter build command runs.
        It should modify project files as needed for the specific platform.
        
        Args:
            app_id: The app identifier
            app_config: The app configuration dictionary
            flavor: Optional flavor/environment name
        """
        pass
    
    @abstractmethod
    def get_build_command(self, build_type: str, output_type: str) -> list:
        """
        Return the Flutter build command for this platform.
        
        Args:
            build_type: Build mode ('release' or 'debug')
            output_type: Output format (e.g., 'apk', 'appbundle', 'ipa')
            
        Returns:
            List of command arguments for subprocess
        """
        pass
    
    @abstractmethod
    def find_build_output(self, build_type: str, output_type: str) -> Path:
        """
        Locate the build output file or directory.
        
        Args:
            build_type: Build mode ('release' or 'debug')
            output_type: Output format
            
        Returns:
            Path to the build output (file or directory)
            
        Raises:
            FileNotFoundError: If build output cannot be found
        """
        pass
    
    @abstractmethod
    def get_output_extension(self, output_type: str) -> str:
        """
        Return the file extension for the given output type.
        
        Args:
            output_type: Output format (e.g., 'apk', 'appbundle')
            
        Returns:
            File extension including the dot (e.g., '.apk', '.zip')
        """
        pass
    
    def _zip_directory(self, source_dir: Path, output_name: str) -> Path:
        """
        Create a zip archive from a directory.
        
        Args:
            source_dir: Directory to archive
            output_name: Name for the zip file (without extension)
            
        Returns:
            Path to the created zip file
        """
        zip_path = self.project_root / "build" / f"{output_name}.zip"
        shutil.make_archive(
            str(zip_path).replace('.zip', ''),
            'zip',
            source_dir
        )
        return zip_path
    
    def _zip_app_bundle(self, app_path: Path, output_name: str) -> Path:
        """
        Create a zip archive from an app bundle (.app directory).
        
        Args:
            app_path: Path to the .app bundle
            output_name: Name for the zip file (without extension)
            
        Returns:
            Path to the created zip file
        """
        zip_path = self.project_root / "build" / f"{output_name}.zip"
        shutil.make_archive(
            str(zip_path).replace('.zip', ''),
            'zip',
            app_path.parent,
            app_path.name
        )
        return zip_path

