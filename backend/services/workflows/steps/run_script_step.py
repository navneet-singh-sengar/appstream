"""
Run Script Step - Executes shell commands or scripts.

This step allows running arbitrary shell commands as part of a workflow.
"""

import os
import subprocess
import shlex
from pathlib import Path
from typing import Optional

from .base import WorkflowStep, StepResult, StepConfigField


class RunScriptStep(WorkflowStep):
    """
    Workflow step that executes shell commands or scripts.
    
    Supports both inline commands and script files with configurable
    working directory and timeout.
    """
    
    step_type = "run_script"
    display_name = "Run Script"
    description = "Execute a shell command or script"
    icon = "Terminal"
    category = "utility"
    
    config_fields = [
        StepConfigField(
            name="script",
            label="Script",
            type="textarea",
            required=True,
            description="Shell command or script to execute",
            placeholder="echo 'Hello World'\nls -la"
        ),
        StepConfigField(
            name="workingDir",
            label="Working Directory",
            type="string",
            required=False,
            description="Directory to run the script in (relative to project root). Leave empty for project root.",
            placeholder="."
        ),
        StepConfigField(
            name="timeout",
            label="Timeout (seconds)",
            type="number",
            required=False,
            default=300,
            description="Maximum execution time in seconds (default: 300)"
        ),
        StepConfigField(
            name="failOnError",
            label="Fail on Error",
            type="boolean",
            required=False,
            default=True,
            description="Fail the step if the script returns a non-zero exit code"
        ),
        StepConfigField(
            name="shell",
            label="Shell",
            type="select",
            required=False,
            default="/bin/bash",
            description="Shell to use for execution",
            options=[
                {"value": "/bin/bash", "label": "Bash"},
                {"value": "/bin/sh", "label": "sh"},
                {"value": "/bin/zsh", "label": "Zsh"},
            ]
        ),
    ]
    
    def validate(self) -> tuple[bool, Optional[str]]:
        """Validate the script configuration."""
        script = self.get_config_value("script")
        if not script or not script.strip():
            return False, "Script is required"
        
        timeout = self.get_config_value("timeout", 300)
        if timeout is not None and (not isinstance(timeout, (int, float)) or timeout <= 0):
            return False, "Timeout must be a positive number"
        
        return True, None
    
    def execute(self, context: dict) -> StepResult:
        """Execute the shell script."""
        try:
            script = self.get_config_value("script", "")
            working_dir = self.get_config_value("workingDir", "")
            timeout = self.get_config_value("timeout", 300)
            fail_on_error = self.get_config_value("failOnError", True)
            shell = self.get_config_value("shell", "/bin/bash")
            
            project_root = context.get("project_root")
            if not project_root:
                return StepResult(
                    success=False,
                    message="Project root not provided",
                    error="Missing project_root in workflow context"
                )
            
            # Determine working directory
            if working_dir:
                cwd = Path(project_root) / working_dir
            else:
                cwd = Path(project_root)
            
            if not cwd.exists():
                return StepResult(
                    success=False,
                    message=f"Working directory does not exist: {cwd}",
                    error=f"Directory not found: {cwd}"
                )
            
            self.log(f"Executing script in {cwd}", "info")
            self.log(f"Script:\n{script}", "terminal")
            
            # Prepare environment
            env = os.environ.copy()
            env.update(context.get("env", {}))
            
            # Execute the script
            process = subprocess.Popen(
                [shell, "-c", script],
                cwd=str(cwd),
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
                universal_newlines=True,
                env=env
            )
            
            output_lines = []
            try:
                for line in process.stdout:
                    line = line.rstrip()
                    output_lines.append(line)
                    self.log(line, "terminal")
                
                process.wait(timeout=timeout)
                
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()
                return StepResult(
                    success=False,
                    message=f"Script timed out after {timeout} seconds",
                    error="Execution timeout",
                    output={"stdout": "\n".join(output_lines)}
                )
            
            exit_code = process.returncode
            success = exit_code == 0 or not fail_on_error
            
            if exit_code != 0:
                self.log(f"Script exited with code {exit_code}", "warning" if not fail_on_error else "error")
            else:
                self.log("Script completed successfully", "success")
            
            return StepResult(
                success=success,
                message=f"Script {'completed' if success else 'failed'} with exit code {exit_code}",
                output={
                    "exit_code": exit_code,
                    "stdout": "\n".join(output_lines),
                },
                error=None if success else f"Exit code: {exit_code}"
            )
            
        except Exception as e:
            self.log(f"Script execution failed: {str(e)}", "error")
            return StepResult(
                success=False,
                message="Script execution failed",
                error=str(e)
            )

