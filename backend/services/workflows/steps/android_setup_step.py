"""
Android Setup workflow step.

Performs Android-specific configuration before build:
- Update app name in strings.xml
- Update package ID in build.gradle.kts
- Update MainActivity.kt package and location
- Extract and apply app icon from res.zip
"""

import base64
import os
import re
import shutil
import tempfile
import zipfile
from pathlib import Path
from typing import Optional

from .base import WorkflowStep, StepResult, StepConfigField


class AndroidSetupStep(WorkflowStep):
    """Workflow step for Android platform setup."""
    
    step_type = "android_setup"
    display_name = "Android Setup"
    description = "Configure Android project: app name, package ID, MainActivity, and app icon"
    icon = "Hammer"
    category = "build"
    
    config_fields = [
        StepConfigField(
            name="update_app_name",
            label="Update App Name",
            type="boolean",
            required=False,
            default=True,
            description="Update app name in android/app/src/main/res/values/strings.xml"
        ),
        StepConfigField(
            name="update_package_id",
            label="Update Package ID",
            type="boolean",
            required=False,
            default=True,
            description="Update package ID in android/app/build.gradle.kts (namespace and applicationId)"
        ),
        StepConfigField(
            name="update_main_activity",
            label="Update MainActivity",
            type="boolean",
            required=False,
            default=True,
            description="Update MainActivity.kt package declaration and move to correct folder structure"
        ),
        StepConfigField(
            name="apply_app_icon",
            label="Apply App Icon",
            type="boolean",
            required=False,
            default=True,
            description="Extract and apply app icon from res.zip to android/app/src/main/res"
        ),
        StepConfigField(
            name="res_zip_file",
            label="App Icon (res.zip)",
            type="file",
            required=False,
            description="Upload res.zip containing mipmap folders for Android app icons. Generate icons at icon.kitchen",
            accept=".zip"
        ),
    ]
    
    def validate(self) -> tuple[bool, Optional[str]]:
        """Validate step configuration."""
        # At least one operation should be enabled
        update_app_name = self.get_config_value("update_app_name", True)
        update_package_id = self.get_config_value("update_package_id", True)
        update_main_activity = self.get_config_value("update_main_activity", True)
        apply_app_icon = self.get_config_value("apply_app_icon", True)
        
        if not any([update_app_name, update_package_id, update_main_activity, apply_app_icon]):
            return False, "At least one setup operation must be enabled"
        
        return True, None
    
    def execute(self, context: dict) -> StepResult:
        """Execute Android setup operations."""
        project_root = Path(context.get("project_root", ""))
        app_config = context.get("app_config", {})
        app_id = context.get("app_id", "")
        apps_dir = context.get("apps_dir")
        
        if not project_root or not project_root.exists():
            return StepResult(
                success=False,
                message="Project root not found",
                error=f"Project root path does not exist: {project_root}"
            )
        
        if not app_config:
            return StepResult(
                success=False,
                message="App configuration not provided",
                error="app_config is required in context"
            )
        
        self.log("Starting Android setup...", "info")
        
        operations_performed = []
        errors = []
        
        # Update app name in strings.xml
        if self.get_config_value("update_app_name", True):
            try:
                self.log("Updating app name in strings.xml...", "info")
                self._update_app_name_in_strings(project_root, app_config)
                operations_performed.append("app_name")
                self.log("App name updated successfully", "success")
            except Exception as e:
                errors.append(f"Failed to update app name: {str(e)}")
                self.log(f"Failed to update app name: {str(e)}", "error")
        
        # Update package ID in build.gradle.kts
        if self.get_config_value("update_package_id", True):
            try:
                self.log("Updating package ID in build.gradle.kts...", "info")
                self._update_package_id_in_build_gradle(project_root, app_config)
                operations_performed.append("package_id")
                self.log("Package ID updated successfully", "success")
            except Exception as e:
                errors.append(f"Failed to update package ID: {str(e)}")
                self.log(f"Failed to update package ID: {str(e)}", "error")
        
        # Update MainActivity.kt
        if self.get_config_value("update_main_activity", True):
            try:
                self.log("Updating MainActivity.kt package and location...", "info")
                self._update_main_activity_package(project_root, app_config)
                operations_performed.append("main_activity")
                self.log("MainActivity.kt updated successfully", "success")
            except Exception as e:
                errors.append(f"Failed to update MainActivity: {str(e)}")
                self.log(f"Failed to update MainActivity: {str(e)}", "error")
        
        # Apply app icon
        if self.get_config_value("apply_app_icon", True):
            try:
                self.log("Applying app icon...", "info")
                if self._extract_and_apply_app_icon(project_root, app_id, apps_dir):
                    operations_performed.append("app_icon")
                    self.log("App icon applied successfully", "success")
                else:
                    self.log("No res.zip found, skipping app icon", "info")
            except Exception as e:
                errors.append(f"Failed to apply app icon: {str(e)}")
                self.log(f"Failed to apply app icon: {str(e)}", "warning")
        
        if errors:
            return StepResult(
                success=False,
                message=f"Android setup completed with errors",
                output={"operations": operations_performed, "errors": errors},
                error="; ".join(errors)
            )
        
        self.log("Android setup completed successfully!", "success")
        return StepResult(
            success=True,
            message=f"Android setup completed: {', '.join(operations_performed)}",
            output={"operations": operations_performed}
        )
    
    def _update_app_name_in_strings(self, project_root: Path, app_config: dict) -> None:
        """Update app name in android/app/src/main/res/values/strings.xml."""
        strings_path = (
            project_root / "android" / "app" / "src" / 
            "main" / "res" / "values" / "strings.xml"
        )
        
        if not strings_path.exists():
            raise FileNotFoundError(f"strings.xml not found at {strings_path}")
        
        with open(strings_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        app_name = app_config.get("appName", "App")
        pattern = r'<string name=["\']app_name["\']>.*?</string>'
        replacement = f'<string name="app_name">{app_name}</string>'
        
        if re.search(pattern, content):
            content = re.sub(pattern, replacement, content)
        else:
            if '<resources>' in content and '</resources>' in content:
                content = content.replace(
                    '</resources>',
                    f'    <string name="app_name">{app_name}</string>\n</resources>'
                )
            else:
                raise ValueError("Could not find or add app_name string in strings.xml")
        
        with open(strings_path, 'w', encoding='utf-8') as f:
            f.write(content)
    
    def _update_package_id_in_build_gradle(self, project_root: Path, app_config: dict) -> None:
        """Update package ID in android/app/build.gradle.kts."""
        build_gradle_path = project_root / "android" / "app" / "build.gradle.kts"
        
        if not build_gradle_path.exists():
            raise FileNotFoundError(f"build.gradle.kts not found at {build_gradle_path}")
        
        with open(build_gradle_path, 'r') as f:
            content = f.read()
        
        package_id = app_config.get("packageId", "")
        if not package_id:
            raise ValueError("packageId not found in app config")
        
        content = re.sub(
            r'namespace\s*=\s*"[^"]*"',
            f'namespace = "{package_id}"',
            content
        )
        content = re.sub(
            r'applicationId\s*=\s*"[^"]*"',
            f'applicationId = "{package_id}"',
            content
        )
        
        with open(build_gradle_path, 'w') as f:
            f.write(content)
    
    def _update_main_activity_package(self, project_root: Path, app_config: dict) -> None:
        """Update MainActivity.kt package and move to correct folder structure."""
        package_id = app_config.get("packageId", "")
        if not package_id:
            raise ValueError("packageId not found in app config")
        
        package_parts = package_id.split('.')
        kotlin_base = project_root / "android" / "app" / "src" / "main" / "kotlin"
        package_dir = kotlin_base / "/".join(package_parts)
        
        package_dir.mkdir(parents=True, exist_ok=True)
        
        # Find existing MainActivity.kt
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
        
        # Update package declaration
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
        
        # Remove old file if different location
        if main_activity_src != main_activity_dst:
            main_activity_src.unlink()
            try:
                main_activity_src.parent.rmdir()
            except OSError:
                pass  # Directory not empty
    
    def _extract_and_apply_app_icon(self, project_root: Path, app_id: str, apps_dir: Optional[Path]) -> bool:
        """Extract res.zip and apply app icon to android/app/src/main/res."""
        android_res_dst = project_root / "android" / "app" / "src" / "main" / "res"
        
        # Check for uploaded file in config (base64 encoded)
        res_zip_file = self.get_config_value("res_zip_file")
        if res_zip_file and isinstance(res_zip_file, dict) and "data" in res_zip_file:
            # Decode base64 and extract
            self.log(f"Using uploaded res.zip: {res_zip_file.get('filename', 'unknown')}", "info")
            return self._extract_base64_zip(res_zip_file["data"], android_res_dst)
        
        # Fallback: check default location in apps_dir
        if apps_dir and app_id:
            res_zip_path = apps_dir / app_id / "android" / "app_icon" / "res.zip"
            if res_zip_path.exists():
                self.log(f"Using res.zip from default location: {res_zip_path}", "info")
                return self._extract_zip_file(res_zip_path, android_res_dst)
        
        return False
    
    def _extract_base64_zip(self, base64_data: str, android_res_dst: Path) -> bool:
        """Extract a base64-encoded zip file to the Android res directory."""
        try:
            # Remove data URL prefix if present (e.g., "data:application/zip;base64,")
            if "," in base64_data:
                base64_data = base64_data.split(",", 1)[1]
            
            # Decode base64
            zip_bytes = base64.b64decode(base64_data)
            
            # Write to temp file and extract
            with tempfile.NamedTemporaryFile(suffix=".zip", delete=False) as tmp_file:
                tmp_file.write(zip_bytes)
                tmp_path = Path(tmp_file.name)
            
            try:
                return self._extract_zip_file(tmp_path, android_res_dst)
            finally:
                tmp_path.unlink()
                
        except Exception as e:
            self.log(f"Failed to extract base64 zip: {str(e)}", "error")
            raise
    
    def _extract_zip_file(self, zip_path: Path, android_res_dst: Path) -> bool:
        """Extract a zip file to the Android res directory."""
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            temp_dir = tempfile.mkdtemp()
            zip_ref.extractall(temp_dir)
            
            # Look for mipmap folders - they might be at root or in a "res" subfolder
            temp_path = Path(temp_dir)
            
            # Check if there's a "res" subfolder
            res_subfolder = temp_path / "res"
            source_dir = res_subfolder if res_subfolder.exists() else temp_path
            
            # Copy mipmap folders
            found_mipmaps = False
            for item in source_dir.iterdir():
                if item.is_dir() and item.name.startswith('mipmap'):
                    dst_path = android_res_dst / item.name
                    if dst_path.exists():
                        shutil.rmtree(dst_path)
                    shutil.copytree(item, dst_path)
                    found_mipmaps = True
                    self.log(f"Copied {item.name} to Android res", "info")
            
            shutil.rmtree(temp_dir)
            return found_mipmaps
