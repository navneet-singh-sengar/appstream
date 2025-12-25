"""
Custom Arguments Step - Adds custom arguments to Flutter build/run commands.

This step provides a single field for users to enter raw command-line arguments
that get appended directly to flutter build or flutter run commands.
"""

import shlex
from typing import Optional

from .base import WorkflowStep, StepResult, StepConfigField


class CustomArgsStep(WorkflowStep):
    """
    Workflow step that provides custom arguments for Flutter commands.
    
    Users can enter any arguments (space or newline separated) that will
    be appended to the flutter build or flutter run command.
    """
    
    step_type = "custom_args"
    display_name = "Custom Arguments"
    description = "Add custom arguments to the Flutter build/run command"
    icon = "Terminal"
    category = "build"
    
    config_fields = [
        StepConfigField(
            name="arguments",
            label="Arguments",
            type="textarea",
            required=False,
            description="Arguments to append to flutter command (space or newline separated)",
            placeholder="--obfuscate\n--dart-define=FLAVOR=prod\n--split-debug-info=build/debug"
        ),
    ]
    
    def validate(self) -> tuple[bool, Optional[str]]:
        """Validate the configuration."""
        # No required fields, always valid
        return True, None
    
    def execute(self, context: dict) -> StepResult:
        """
        Extract and return the arguments.
        
        This step doesn't perform any action itself - the arguments are
        extracted by BuildService/FlutterRunService and appended to commands.
        """
        arguments = self.get_config_value("arguments", "")
        parsed_args = self.parse_arguments(arguments)
        
        if parsed_args:
            self.log(f"Custom arguments: {' '.join(parsed_args)}", "info")
        else:
            self.log("No custom arguments configured", "info")
        
        return StepResult(
            success=True,
            message="Custom arguments configured",
            output={
                "arguments": parsed_args,
            }
        )
    
    @staticmethod
    def parse_arguments(arguments: str) -> list[str]:
        """
        Parse arguments string into a list.
        
        Handles both space-separated and newline-separated arguments.
        Uses shlex for proper parsing of quoted strings.
        
        Args:
            arguments: Raw arguments string
            
        Returns:
            List of parsed arguments
        """
        if not arguments or not arguments.strip():
            return []
        
        # First, normalize newlines to spaces
        normalized = arguments.replace('\n', ' ').replace('\r', ' ')
        
        try:
            # Use shlex to properly parse (handles quoted strings)
            return shlex.split(normalized)
        except ValueError:
            # Fallback to simple split if shlex fails
            return [arg.strip() for arg in normalized.split() if arg.strip()]
    
    @classmethod
    def extract_arguments_from_config(cls, config: dict) -> list[str]:
        """
        Static helper to extract arguments from step config.
        
        Args:
            config: Step configuration dictionary
            
        Returns:
            List of parsed arguments
        """
        arguments = config.get("arguments", "")
        return cls.parse_arguments(str(arguments) if arguments else "")

