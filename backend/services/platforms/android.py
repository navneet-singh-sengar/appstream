"""
Android platform handler for Flutter build operations.

Handles all Android-specific setup including:
- App name in strings.xml
- Package ID in build.gradle.kts
- MainActivity.kt package and location
- App icons from res.zip
- Firebase configuration
- Product flavors for multiple environments
"""

import os
import re
import shutil
import tempfile
import zipfile
from pathlib import Path
from typing import Optional

from .base import PlatformHandler


class AndroidHandler(PlatformHandler):
    """Handler for Android platform builds."""
    
    platform = "android"
    
    def setup(self, app_id: str, app_config: dict, flavor: Optional[str] = None) -> None:
        """
        Apply Android-specific configuration before build.
        
        Args:
            app_id: The app identifier
            app_config: The app configuration dictionary
            flavor: Optional flavor/environment name
        """
        self.log("Setting up Android configuration...", "info")
        
        # Update app name in strings.xml
        self.log("Updating app name in strings.xml...", "info")
        self._update_app_name_in_strings(app_config)
        self.log("App name updated successfully", "info")
        
        # Update package ID in build.gradle.kts
        self.log("Updating package ID in build.gradle.kts...", "info")
        self._update_package_id_in_build_gradle(app_config)
        self.log("Package ID updated in build.gradle.kts", "info")
        
        # Setup flavors if multiple environments
        if app_config.get('environments') and len(app_config['environments']) > 1:
            self.log("Setting up Flutter flavors for multiple environments...", "info")
            self._setup_flutter_flavors(app_config)
            self.log("Flutter flavors configured successfully", "info")
        else:
            self.log("Single environment detected, skipping flavor setup", "info")
        
        # Update MainActivity.kt package and location
        self.log("Updating MainActivity.kt package and location...", "info")
        self._update_main_activity_package(app_config)
        self.log("MainActivity.kt updated successfully", "info")
        
        # Extract and apply app icon
        self.log("Extracting and applying app icon...", "info")
        try:
            self._extract_and_apply_app_icon(app_id)
            self.log("App icon applied successfully", "info")
        except Exception as e:
            self.log(f"Failed to apply app icon: {str(e)}", "warning")
            self.log("Continuing without app icon update", "warning")
        
        # Apply Firebase configuration if flavor specified
        if flavor and flavor.strip():
            self.log("Applying Firebase configuration...", "info")
            try:
                if self._apply_firebase_config(app_id, flavor):
                    self.log("Firebase configuration applied successfully", "info")
                else:
                    self.log("No Firebase configuration found for this environment", "info")
            except Exception as e:
                self.log(f"Failed to apply Firebase configuration: {str(e)}", "warning")
                self.log("Continuing without Firebase configuration", "warning")
        else:
            self.log("No flavor specified, skipping Firebase configuration", "info")
        
        self.log("Android setup completed successfully!", "success")
    
    def get_build_command(self, build_type: str, output_type: str) -> list:
        """Return the Flutter build command for Android."""
        mode_flag = "--release" if build_type == "release" else "--debug"
        
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
    
    # -------------------------------------------------------------------------
    # Private methods for Android-specific setup
    # -------------------------------------------------------------------------
    
    def _update_app_name_in_strings(self, app_config: dict) -> None:
        """Update app name in android/app/src/main/res/values/strings.xml."""
        strings_path = (
            self.project_root / "android" / "app" / "src" / 
            "main" / "res" / "values" / "strings.xml"
        )
        
        if not strings_path.exists():
            raise FileNotFoundError(f"strings.xml not found at {strings_path}")
        
        with open(strings_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        pattern = r'<string name=["\']app_name["\']>.*?</string>'
        replacement = f'<string name="app_name">{app_config["appName"]}</string>'
        
        if re.search(pattern, content):
            content = re.sub(pattern, replacement, content)
        else:
            if '<resources>' in content and '</resources>' in content:
                content = content.replace(
                    '</resources>',
                    f'    <string name="app_name">{app_config["appName"]}</string>\n</resources>'
                )
            else:
                raise ValueError("Could not find or add app_name string in strings.xml")
        
        with open(strings_path, 'w', encoding='utf-8') as f:
            f.write(content)
    
    def _update_package_id_in_build_gradle(self, app_config: dict) -> None:
        """Update package ID in android/app/build.gradle.kts."""
        build_gradle_path = self.project_root / "android" / "app" / "build.gradle.kts"
        
        if not build_gradle_path.exists():
            raise FileNotFoundError(f"build.gradle.kts not found at {build_gradle_path}")
        
        with open(build_gradle_path, 'r') as f:
            content = f.read()
        
        content = re.sub(
            r'namespace\s*=\s*"[^"]*"',
            f'namespace = "{app_config["packageId"]}"',
            content
        )
        content = re.sub(
            r'applicationId\s*=\s*"[^"]*"',
            f'applicationId = "{app_config["packageId"]}"',
            content
        )
        
        with open(build_gradle_path, 'w') as f:
            f.write(content)
    
    def _setup_flutter_flavors(self, app_config: dict) -> None:
        """Setup Flutter flavors in build.gradle.kts based on environments."""
        build_gradle_path = self.project_root / "android" / "app" / "build.gradle.kts"
        
        if not build_gradle_path.exists():
            raise FileNotFoundError(f"build.gradle.kts not found at {build_gradle_path}")
        
        with open(build_gradle_path, 'r') as f:
            content = f.read()
        
        environments = app_config.get('environments', [])
        if len(environments) < 2:
            if "flavorDimensions" in content:
                self._remove_flavor_configuration(content, build_gradle_path)
            return
        
        if "flavorDimensions" not in content:
            android_block_start = content.find("android {")
            if android_block_start == -1:
                raise ValueError("Could not find android block in build.gradle.kts")
            
            brace_count = 0
            android_block_end = -1
            for i in range(android_block_start, len(content)):
                if content[i] == '{':
                    brace_count += 1
                elif content[i] == '}':
                    brace_count -= 1
                    if brace_count == 0:
                        android_block_end = i
                        break
            
            if android_block_end == -1:
                raise ValueError("Could not find end of android block in build.gradle.kts")
            
            flavors_config = '\n    flavorDimensions += "environment"\n    productFlavors {\n'
            for env in environments:
                flavor_name = env['name'].lower().replace(' ', '_')
                if flavor_name == 'production':
                    flavors_config += f'''        create("{flavor_name}") {{
            dimension = "environment"
            resValue("string", "app_name", "{app_config['appName']}")
        }}
'''
                else:
                    flavors_config += f'''        create("{flavor_name}") {{
            dimension = "environment"
            applicationIdSuffix = ".{flavor_name}"
            resValue("string", "app_name", "{app_config['appName']} ({env['name'].title()})")
        }}
'''
            flavors_config += "    }\n"
            
            content = content[:android_block_end] + flavors_config + content[android_block_end:]
        
        with open(build_gradle_path, 'w') as f:
            f.write(content)
    
    def _remove_flavor_configuration(self, content: str, build_gradle_path: Path) -> None:
        """Remove existing flavor configuration from build.gradle.kts."""
        content = re.sub(r'\s*flavorDimensions\s*\+=\s*"environment"\s*\n', '', content)
        
        product_flavors_start = content.find("productFlavors {")
        if product_flavors_start != -1:
            brace_count = 0
            product_flavors_end = -1
            for i in range(product_flavors_start, len(content)):
                if content[i] == '{':
                    brace_count += 1
                elif content[i] == '}':
                    brace_count -= 1
                    if brace_count == 0:
                        product_flavors_end = i + 1
                        break
            
            if product_flavors_end != -1:
                content = content[:product_flavors_start] + content[product_flavors_end:]
        
        with open(build_gradle_path, 'w') as f:
            f.write(content)
    
    def _update_main_activity_package(self, app_config: dict) -> None:
        """Update MainActivity.kt package and move to correct folder structure."""
        package_id = app_config["packageId"]
        
        package_parts = package_id.split('.')
        kotlin_base = self.project_root / "android" / "app" / "src" / "main" / "kotlin"
        package_dir = kotlin_base / "/".join(package_parts)
        
        package_dir.mkdir(parents=True, exist_ok=True)
        
        main_activity_src = None
        for root, dirs, files in os.walk(kotlin_base):
            for file in files:
                if file == "MainActivity.kt":
                    main_activity_src = Path(root) / file
                    break
            if main_activity_src:
                break
        
        if not main_activity_src or not main_activity_src.exists():
            raise FileNotFoundError("MainActivity.kt not found")
        
        with open(main_activity_src, 'r') as f:
            content = f.read()
        
        lines = content.split('\n')
        updated_lines = []
        in_imports = True
        
        for line in lines:
            if in_imports and line.strip().startswith('package '):
                updated_lines.append(f'package {package_id}')
                in_imports = False
            elif in_imports and line.strip().startswith('import '):
                updated_lines.append(line)
            elif in_imports and line.strip() == '':
                updated_lines.append(line)
            elif in_imports:
                updated_lines.append(f'package {package_id}')
                updated_lines.append('')
                updated_lines.append(line)
                in_imports = False
            else:
                updated_lines.append(line)
        
        main_activity_dst = package_dir / "MainActivity.kt"
        with open(main_activity_dst, 'w') as f:
            f.write('\n'.join(updated_lines))
        
        if main_activity_src != main_activity_dst:
            main_activity_src.unlink()
            try:
                main_activity_src.parent.rmdir()
            except OSError:
                pass
    
    def _extract_and_apply_app_icon(self, app_id: str) -> None:
        """Extract res.zip and apply app icon to android/app/src/main/res."""
        res_zip_path = self.apps_dir / app_id / "android" / "app_icon" / "res.zip"
        android_res_dst = self.project_root / "android" / "app" / "src" / "main" / "res"
        
        if not res_zip_path.exists():
            return
        
        with zipfile.ZipFile(res_zip_path, 'r') as zip_ref:
            temp_dir = tempfile.mkdtemp()
            zip_ref.extractall(temp_dir)
            
            temp_res_dir = Path(temp_dir) / "res"
            if temp_res_dir.exists():
                for item in temp_res_dir.iterdir():
                    if item.is_dir() and item.name.startswith('mipmap'):
                        dst_path = android_res_dst / item.name
                        if dst_path.exists():
                            shutil.rmtree(dst_path)
                        shutil.copytree(item, dst_path)
            
            shutil.rmtree(temp_dir)
    
    def _apply_firebase_config(self, app_id: str, flavor: str) -> bool:
        """Apply Firebase configuration for the selected environment."""
        firebase_src = self.apps_dir / app_id / "android" / "firebase" / flavor / "google-services.json"
        firebase_dst = self.project_root / "android" / "app" / "google-services.json"
        
        if firebase_src.exists():
            shutil.copy2(firebase_src, firebase_dst)
            return True
        return False

