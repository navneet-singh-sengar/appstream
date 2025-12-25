"""
Android platform handler for Flutter build operations.

Handles Android-specific build commands and output location.
Setup operations are now handled by the AndroidSetupStep workflow step.
"""

from pathlib import Path
from typing import Optional

from .base import PlatformHandler


class AndroidHandler(PlatformHandler):
    """Handler for Android platform builds."""
    
    platform = "android"
    
    def setup(self, app_id: str, app_config: dict, flavor: Optional[str] = None) -> None:
        """
        Platform setup is now handled by workflow steps.
        
        Use the "Android Setup" workflow step in pre-build steps to configure:
        - App name in strings.xml
        - Package ID in build.gradle.kts
        - MainActivity.kt package and location
        - App icon from res.zip
        
        This method is kept for interface compatibility but performs no operations.
        """
        self.log("Android setup is now managed via workflow steps", "info")
        self.log("Add 'Android Setup' step to pre-build workflow for configuration", "info")
    
    def get_build_command(self, build_type: str, output_type: str) -> list:
        """Return the Flutter build command for Android."""
        mode_flags = {
            "release": "--release",
            "debug": "--debug",
            "profile": "--profile",
        }
        mode_flag = mode_flags.get(build_type, "--release")
        
        if output_type == "appbundle":
            return ["flutter", "build", "appbundle", mode_flag]
        else:
            return ["flutter", "build", "apk", mode_flag]
    
    def find_build_output(self, build_type: str, output_type: str) -> Path:
        """Locate the Android build output file."""
        if output_type == "appbundle":
            path = (
                self.project_root / "build" / "app" / "outputs" / 
                "bundle" / build_type / f"app-{build_type}.aab"
            )
        else:
            path = (
                self.project_root / "build" / "app" / "outputs" / 
                "flutter-apk" / f"app-{build_type}.apk"
            )
        
        if not path.exists():
            raise FileNotFoundError(f"Build output not found at: {path}")
        
        return path
    
    def get_output_extension(self, output_type: str) -> str:
        """Return file extension for Android output types."""
        extensions = {
            'apk': '.apk',
            'appbundle': '.aab',
        }
        return extensions.get(output_type, '.apk')
