"""
Linux platform handler for Flutter build operations.

Handles Linux-specific setup and build operations including:
- Desktop entry configuration (future)
- AppImage/Snap packaging (future)
- Build output packaging
"""

from pathlib import Path
from typing import Optional

from .base import PlatformHandler


class LinuxHandler(PlatformHandler):
    """Handler for Linux platform builds."""
    
    platform = "linux"
    
    def setup(self, app_id: str, app_config: dict, flavor: Optional[str] = None) -> None:
        """
        Apply Linux-specific configuration before build.
        
        Currently minimal setup - can be extended for:
        - Desktop entry file updates
        - AppImage configuration
        - Snap/Flatpak packaging
        
        Args:
            app_id: The app identifier
            app_config: The app configuration dictionary
            flavor: Optional flavor/environment name
        """
        self.log("Setting up Linux configuration...", "info")
        
        # TODO: Update desktop entry file
        # TODO: Configure AppImage packaging
        # TODO: Update app icon
        
        self.log("Linux setup completed (minimal configuration)", "success")
    
    def get_build_command(self, build_type: str, output_type: str) -> list:
        """Return the Flutter build command for Linux."""
        mode_flag = "--release" if build_type == "release" else "--debug"
        return ["flutter", "build", "linux", mode_flag]
    
    def find_build_output(self, build_type: str, output_type: str) -> Path:
        """Locate the Linux build output and package it as a zip."""
        build_config = "release" if build_type == "release" else "debug"
        linux_dir = (
            self.project_root / "build" / "linux" / "x64" / 
            build_config / "bundle"
        )
        
        if not linux_dir.exists():
            raise FileNotFoundError(f"Build output not found at: {linux_dir}")
        
        # Package the build directory as a zip
        zip_path = self._zip_directory(linux_dir, f"linux_{build_type}")
        return zip_path
    
    def get_output_extension(self, output_type: str) -> str:
        """Return file extension for Linux output types."""
        return '.zip'

