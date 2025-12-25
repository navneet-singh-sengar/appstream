"""
Move File Step - Moves files or directories.

This step allows moving files or directories as part of a workflow.
"""

import shutil
from pathlib import Path
from typing import Optional

from .base import WorkflowStep, StepResult, StepConfigField


class MoveFileStep(WorkflowStep):
    """
    Workflow step that moves files or directories.
    
    Supports moving single files or entire directories with
    optional overwrite behavior.
    """
    
    step_type = "move_file"
    display_name = "Move File"
    description = "Move a file or directory to a new location"
    icon = "FileOutput"
    category = "file"
    
    config_fields = [
        StepConfigField(
            name="source",
            label="Source Path",
            type="string",
            required=True,
            description="Path to the file or directory to move (relative to project root)",
            placeholder="build/app/outputs/flutter-apk/app-release.apk"
        ),
        StepConfigField(
            name="destination",
            label="Destination Path",
            type="string",
            required=True,
            description="Destination path (relative to project root or absolute)",
            placeholder="releases/app.apk"
        ),
        StepConfigField(
            name="overwrite",
            label="Overwrite Existing",
            type="boolean",
            required=False,
            default=False,
            description="Overwrite if destination already exists"
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
        """Validate the move configuration."""
        source = self.get_config_value("source")
        if not source or not source.strip():
            return False, "Source path is required"
        
        destination = self.get_config_value("destination")
        if not destination or not destination.strip():
            return False, "Destination path is required"
        
        return True, None
    
    def execute(self, context: dict) -> StepResult:
        """Execute the file move operation."""
        try:
            source = self.get_config_value("source", "")
            destination = self.get_config_value("destination", "")
            overwrite = self.get_config_value("overwrite", False)
            create_dirs = self.get_config_value("createDirs", True)
            
            project_root = context.get("project_root")
            if not project_root:
                return StepResult(
                    success=False,
                    message="Project root not provided",
                    error="Missing project_root in workflow context"
                )
            
            project_root = Path(project_root)
            
            # Resolve source path
            source_path = Path(source)
            if not source_path.is_absolute():
                source_path = project_root / source_path
            
            # Resolve destination path
            dest_path = Path(destination)
            if not dest_path.is_absolute():
                dest_path = project_root / dest_path
            
            # Check source exists
            if not source_path.exists():
                return StepResult(
                    success=False,
                    message=f"Source does not exist: {source_path}",
                    error=f"File not found: {source}"
                )
            
            # Check destination
            if dest_path.exists() and not overwrite:
                return StepResult(
                    success=False,
                    message=f"Destination already exists: {dest_path}",
                    error="Destination exists and overwrite is disabled"
                )
            
            # Create destination directory if needed
            if create_dirs:
                dest_path.parent.mkdir(parents=True, exist_ok=True)
            elif not dest_path.parent.exists():
                return StepResult(
                    success=False,
                    message=f"Destination directory does not exist: {dest_path.parent}",
                    error="Destination directory not found"
                )
            
            self.log(f"Moving {source_path} to {dest_path}", "info")
            
            # Remove existing destination if overwriting
            if dest_path.exists() and overwrite:
                if dest_path.is_dir():
                    shutil.rmtree(dest_path)
                else:
                    dest_path.unlink()
            
            # Perform the move
            shutil.move(str(source_path), str(dest_path))
            
            self.log(f"Successfully moved to {dest_path}", "success")
            
            return StepResult(
                success=True,
                message=f"Moved {source} to {destination}",
                output={
                    "source": str(source_path),
                    "destination": str(dest_path),
                }
            )
            
        except Exception as e:
            self.log(f"Move failed: {str(e)}", "error")
            return StepResult(
                success=False,
                message="Move operation failed",
                error=str(e)
            )

