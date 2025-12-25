"""
Base class for workflow steps.

All workflow steps must inherit from WorkflowStep and implement
the required abstract methods.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Callable, Optional


@dataclass
class StepResult:
    """Result of a workflow step execution."""
    success: bool
    message: str
    output: Optional[dict] = None
    error: Optional[str] = None


@dataclass
class StepConfigField:
    """Definition of a configuration field for a step."""
    name: str
    label: str
    type: str  # 'string', 'number', 'boolean', 'select', 'multiselect', 'textarea', 'file'
    required: bool = False
    default: Any = None
    description: str = ""
    options: list = field(default_factory=list)  # For select/multiselect types
    placeholder: str = ""
    accept: str = ""  # For file type: accepted file extensions (e.g., ".zip")


class WorkflowStep(ABC):
    """
    Abstract base class for all workflow steps.
    
    To create a new step:
    1. Create a new file in the steps/ directory
    2. Inherit from WorkflowStep
    3. Set the class attributes (step_type, display_name, etc.)
    4. Define config_fields for the configuration UI
    5. Implement execute() and validate() methods
    
    The step will be automatically discovered and registered.
    """
    
    # Step metadata (override in subclasses)
    step_type: str = ""
    display_name: str = ""
    description: str = ""
    icon: str = ""  # Lucide icon name for the frontend
    category: str = "general"  # For grouping in the UI
    
    # Configuration fields for the UI
    config_fields: list[StepConfigField] = []
    
    def __init__(self, config: dict, log_fn: Callable[[str, str], None]):
        """
        Initialize the step.
        
        Args:
            config: Step configuration dictionary
            log_fn: Logging function that accepts (message, level)
        """
        self.config = config
        self._log_fn = log_fn
    
    def log(self, message: str, level: str = "info") -> None:
        """
        Log a message.
        
        Args:
            message: The message to log
            level: Log level ('info', 'success', 'warning', 'error', 'terminal')
        """
        if self._log_fn:
            self._log_fn(message, level)
    
    @abstractmethod
    def execute(self, context: dict) -> StepResult:
        """
        Execute the step.
        
        Args:
            context: Execution context containing:
                - project_id: The project identifier
                - project_root: Path to the Flutter project root
                - app_id: The app identifier
                - app_config: The app configuration dictionary
                - workflow_id: The workflow identifier
                - run_id: Unique identifier for this workflow run
                - env: Environment variables to use
                
        Returns:
            StepResult indicating success/failure with details
        """
        pass
    
    @abstractmethod
    def validate(self) -> tuple[bool, Optional[str]]:
        """
        Validate the step configuration before execution.
        
        Returns:
            Tuple of (is_valid, error_message)
            If valid, error_message should be None
        """
        pass
    
    def get_config_value(self, key: str, default: Any = None) -> Any:
        """
        Get a configuration value with optional default.
        
        Args:
            key: Configuration key
            default: Default value if key not found
            
        Returns:
            Configuration value or default
        """
        return self.config.get(key, default)
    
    @classmethod
    def get_metadata(cls) -> dict:
        """
        Get step metadata for the frontend.
        
        Returns:
            Dictionary with step metadata
        """
        return {
            "type": cls.step_type,
            "displayName": cls.display_name,
            "description": cls.description,
            "icon": cls.icon,
            "category": cls.category,
            "configFields": [
                {
                    "name": f.name,
                    "label": f.label,
                    "type": f.type,
                    "required": f.required,
                    "default": f.default,
                    "description": f.description,
                    "options": f.options,
                    "placeholder": f.placeholder,
                    "accept": f.accept,
                }
                for f in cls.config_fields
            ]
        }

