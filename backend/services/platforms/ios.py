"""
iOS platform handler for Flutter build operations.

Handles iOS-specific setup and build operations including:
- Info.plist updates (future)
- Code signing configuration (future)
- Build output packaging
"""

from pathlib import Path
from typing import Optional

from .base import PlatformHandler


class IOSHandler(PlatformHandler):
    """Handler for iOS platform builds."""
    
    platform = "ios"
    
    def setup(self, app_id: str, app_config: dict, flavor: Optional[str] = None) -> None:
        """
        Apply iOS-specific configuration before build.
        
        Currently minimal setup - can be extended for:
        - Info.plist customization (bundle ID, app name, etc.)
        - Code signing configuration
        - Provisioning profile setup
        
        Args:
            app_id: The app identifier
            app_config: The app configuration dictionary
            flavor: Optional flavor/environment name
        """
        self.log("Setting up iOS configuration...", "info")
        
        # TODO: Add Info.plist updates for app name, bundle ID
        # TODO: Add code signing configuration
        # TODO: Add provisioning profile setup
        
        self.log("iOS setup completed (minimal configuration)", "success")
    
    def get_build_command(self, build_type: str, output_type: str) -> list:
        """Return the Flutter build command for iOS."""
        mode_flags = {
            "release": "--release",
            "debug": "--debug",
            "profile": "--profile",
        }
        mode_flag = mode_flags.get(build_type, "--release")
        return ["flutter", "build", "ios", mode_flag, "--no-codesign"]
    
    def find_build_output(self, build_type: str, output_type: str) -> Path:
        """Locate the iOS build output and package it as a zip."""
        app_path = self.project_root / "build" / "ios" / "iphoneos" / "Runner.app"
        
        if not app_path.exists():
            raise FileNotFoundError(f"Build output not found at: {app_path}")
        
        # Package the .app bundle as a zip
        zip_path = self._zip_app_bundle(app_path, f"ios_{build_type}")
        return zip_path
    
    def get_output_extension(self, output_type: str) -> str:
        """Return file extension for iOS output types."""
        # iOS builds are packaged as zip files containing the .app bundle
        return '.zip'

