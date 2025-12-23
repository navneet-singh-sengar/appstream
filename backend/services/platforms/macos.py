"""
macOS platform handler for Flutter build operations.

Handles macOS-specific setup and build operations including:
- App bundle configuration (future)
- Code signing (future)
- Build output packaging
"""

from pathlib import Path
from typing import Optional

from .base import PlatformHandler


class MacOSHandler(PlatformHandler):
    """Handler for macOS platform builds."""
    
    platform = "macos"
    
    def setup(self, app_id: str, app_config: dict, flavor: Optional[str] = None) -> None:
        """
        Apply macOS-specific configuration before build.
        
        Currently minimal setup - can be extended for:
        - Info.plist customization
        - Entitlements configuration
        - Code signing setup
        
        Args:
            app_id: The app identifier
            app_config: The app configuration dictionary
            flavor: Optional flavor/environment name
        """
        self.log("Setting up macOS configuration...", "info")
        
        # TODO: Update Info.plist with app name, bundle ID
        # TODO: Configure entitlements
        # TODO: Setup code signing
        
        self.log("macOS setup completed (minimal configuration)", "success")
    
    def get_build_command(self, build_type: str, output_type: str) -> list:
        """Return the Flutter build command for macOS."""
        mode_flag = "--release" if build_type == "release" else "--debug"
        return ["flutter", "build", "macos", mode_flag]
    
    def find_build_output(self, build_type: str, output_type: str) -> Path:
        """Locate the macOS build output and package it as a zip."""
        build_config = "Release" if build_type == "release" else "Debug"
        app_path = (
            self.project_root / "build" / "macos" / "Build" / 
            "Products" / build_config
        )
        
        if not app_path.exists():
            raise FileNotFoundError(f"Build output not found at: {app_path}")
        
        # Package the build directory as a zip
        zip_path = self._zip_directory(app_path, f"macos_{build_type}")
        return zip_path
    
    def get_output_extension(self, output_type: str) -> str:
        """Return file extension for macOS output types."""
        return '.zip'

