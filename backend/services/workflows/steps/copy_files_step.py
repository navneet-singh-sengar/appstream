"""
Copy Files Step - Copies files or directories.

This step allows copying files or directories as part of a workflow,
with support for glob patterns.
"""

import glob
import shutil
from pathlib import Path
from typing import Optional

from .base import WorkflowStep, StepResult, StepConfigField


class CopyFilesStep(WorkflowStep):
    """
    Workflow step that copies files or directories.
    
    Supports copying single files, directories, or multiple files
    using glob patterns.
    """
    
    step_type = "copy_files"
    display_name = "Copy Files"
    description = "Copy files or directories to a new location"
    icon = "Copy"
    category = "file"
    
    config_fields = [
        StepConfigField(
            name="source",
            label="Source Path/Pattern",
            type="string",
            required=True,
            description="Path to file/directory or glob pattern (relative to project root)",
            placeholder="build/**/*.apk"
        ),
        StepConfigField(
            name="destination",
            label="Destination Directory",
            type="string",
            required=True,
            description="Destination directory (relative to project root or absolute)",
            placeholder="releases/"
        ),
        StepConfigField(
            name="overwrite",
            label="Overwrite Existing",
            type="boolean",
            required=False,
            default=False,
            description="Overwrite if destination files already exist"
        ),
        StepConfigField(
            name="preserveStructure",
            label="Preserve Directory Structure",
            type="boolean",
            required=False,
            default=False,
            description="Preserve relative directory structure when copying with patterns"
        ),
        StepConfigField(
            name="createDirs",
            label="Create Directories",
            type="boolean",
            required=False,
            default=True,
            description="Create destination directories if they don't exist"
        ),
    ]
    
    def validate(self) -> tuple[bool, Optional[str]]:
        """Validate the copy configuration."""
        source = self.get_config_value("source")
        if not source or not source.strip():
            return False, "Source path/pattern is required"
        
        destination = self.get_config_value("destination")
        if not destination or not destination.strip():
            return False, "Destination directory is required"
        
        return True, None
    
    def execute(self, context: dict) -> StepResult:
        """Execute the file copy operation."""
        try:
            source = self.get_config_value("source", "")
            destination = self.get_config_value("destination", "")
            overwrite = self.get_config_value("overwrite", False)
            preserve_structure = self.get_config_value("preserveStructure", False)
            create_dirs = self.get_config_value("createDirs", True)
            
            project_root = context.get("project_root")
            if not project_root:
                return StepResult(
                    success=False,
                    message="Project root not provided",
                    error="Missing project_root in workflow context"
                )
            
            project_root = Path(project_root)
            
            # Resolve destination path
            dest_path = Path(destination)
            if not dest_path.is_absolute():
                dest_path = project_root / dest_path
            
            # Create destination directory if needed
            if create_dirs:
                dest_path.mkdir(parents=True, exist_ok=True)
            elif not dest_path.exists():
                return StepResult(
                    success=False,
                    message=f"Destination directory does not exist: {dest_path}",
                    error="Destination directory not found"
                )
            
            # Resolve source - check if it's a glob pattern
            source_path = Path(source)
            if not source_path.is_absolute():
                source_pattern = str(project_root / source)
            else:
                source_pattern = source
            
            # Find files matching the pattern
            if '*' in source or '?' in source or '[' in source:
                # Glob pattern
                files = glob.glob(source_pattern, recursive=True)
            else:
                # Single file or directory
                files = [source_pattern] if Path(source_pattern).exists() else []
            
            if not files:
                return StepResult(
                    success=False,
                    message=f"No files found matching: {source}",
                    error="No matching files"
                )
            
            self.log(f"Found {len(files)} file(s) to copy", "info")
            
            copied_files = []
            for file_path in files:
                file_path = Path(file_path)
                
                if preserve_structure:
                    # Calculate relative path from project root
                    try:
                        rel_path = file_path.relative_to(project_root)
                    except ValueError:
                        rel_path = file_path.name
                    final_dest = dest_path / rel_path
                else:
                    final_dest = dest_path / file_path.name
                
                # Check if destination exists
                if final_dest.exists() and not overwrite:
                    self.log(f"Skipping {file_path.name} (already exists)", "warning")
                    continue
                
                # Create parent directories
                if create_dirs:
                    final_dest.parent.mkdir(parents=True, exist_ok=True)
                
                self.log(f"Copying {file_path.name} to {final_dest}", "info")
                
                # Perform the copy
                if file_path.is_dir():
                    if final_dest.exists() and overwrite:
                        shutil.rmtree(final_dest)
                    shutil.copytree(str(file_path), str(final_dest))
                else:
                    shutil.copy2(str(file_path), str(final_dest))
                
                copied_files.append({
                    "source": str(file_path),
                    "destination": str(final_dest),
                })
            
            if not copied_files:
                return StepResult(
                    success=False,
                    message="No files were copied (all skipped or failed)",
                    error="No files copied"
                )
            
            self.log(f"Successfully copied {len(copied_files)} file(s)", "success")
            
            return StepResult(
                success=True,
                message=f"Copied {len(copied_files)} file(s) to {destination}",
                output={
                    "copied_files": copied_files,
                    "count": len(copied_files),
                }
            )
            
        except Exception as e:
            self.log(f"Copy failed: {str(e)}", "error")
            return StepResult(
                success=False,
                message="Copy operation failed",
                error=str(e)
            )

