"""
Windows platform handler for Flutter build operations.

Handles Windows-specific setup and build operations including:
- Executable configuration (future)
- MSIX packaging (future)
- Build output packaging
"""

from pathlib import Path
from typing import Optional

from .base import PlatformHandler


class WindowsHandler(PlatformHandler):
    """Handler for Windows platform builds."""
    
    platform = "windows"
    
    def setup(self, app_id: str, app_config: dict, flavor: Optional[str] = None) -> None:
        """
        Apply Windows-specific configuration before build.
        
        Currently minimal setup - can be extended for:
        - Runner configuration
        - MSIX manifest updates
        - Version info updates
        
        Args:
            app_id: The app identifier
            app_config: The app configuration dictionary
            flavor: Optional flavor/environment name
        """
        self.log("Setting up Windows configuration...", "info")
        
        # TODO: Update Runner.rc with app name, version
        # TODO: Configure MSIX packaging
        # TODO: Update app icon
        
        self.log("Windows setup completed (minimal configuration)", "success")
    
    def get_build_command(self, build_type: str, output_type: str) -> list:
        """Return the Flutter build command for Windows."""
        mode_flag = "--release" if build_type == "release" else "--debug"
        return ["flutter", "build", "windows", mode_flag]
    
    def find_build_output(self, build_type: str, output_type: str) -> Path:
        """Locate the Windows build output and package it as a zip."""
        build_config = "Release" if build_type == "release" else "Debug"
        exe_dir = (
            self.project_root / "build" / "windows" / "x64" / 
            "runner" / build_config
        )
        
        if not exe_dir.exists():
            raise FileNotFoundError(f"Build output not found at: {exe_dir}")
        
        # Package the build directory as a zip
        zip_path = self._zip_directory(exe_dir, f"windows_{build_type}")
        return zip_path
    
    def get_output_extension(self, output_type: str) -> str:
        """Return file extension for Windows output types."""
        return '.zip'

