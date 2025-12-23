"""
Web platform handler for Flutter build operations.

Handles Web-specific setup and build operations including:
- index.html customization (future)
- PWA configuration (future)
- Build output packaging
"""

from pathlib import Path
from typing import Optional

from .base import PlatformHandler


class WebHandler(PlatformHandler):
    """Handler for Web platform builds."""
    
    platform = "web"
    
    def setup(self, app_id: str, app_config: dict, flavor: Optional[str] = None) -> None:
        """
        Apply Web-specific configuration before build.
        
        Currently minimal setup - can be extended for:
        - index.html customization (title, meta tags)
        - PWA manifest configuration
        - Favicon updates
        
        Args:
            app_id: The app identifier
            app_config: The app configuration dictionary
            flavor: Optional flavor/environment name
        """
        self.log("Setting up Web configuration...", "info")
        
        # TODO: Update index.html title with app name
        # TODO: Update PWA manifest
        # TODO: Update favicon
        
        self.log("Web setup completed (minimal configuration)", "success")
    
    def get_build_command(self, build_type: str, output_type: str) -> list:
        """Return the Flutter build command for Web."""
        mode_flag = "--release" if build_type == "release" else "--debug"
        return ["flutter", "build", "web", mode_flag]
    
    def find_build_output(self, build_type: str, output_type: str) -> Path:
        """Locate the Web build output and package it as a zip."""
        web_dir = self.project_root / "build" / "web"
        
        if not web_dir.exists():
            raise FileNotFoundError(f"Build output not found at: {web_dir}")
        
        # Package the web directory as a zip
        zip_path = self._zip_directory(web_dir, f"web_{build_type}")
        return zip_path
    
    def get_output_extension(self, output_type: str) -> str:
        """Return file extension for Web output types."""
        return '.zip'

