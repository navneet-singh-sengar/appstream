"""
Step Registry - Auto-discovers and registers workflow steps.

To add a new step, simply create a new file in this directory
that defines a class inheriting from WorkflowStep. The registry
will automatically discover and register it.
"""

import importlib
import pkgutil
from pathlib import Path
from typing import Type

from .base import WorkflowStep, StepResult, StepConfigField


class StepRegistry:
    """
    Registry for workflow steps.
    
    Automatically discovers step classes from the steps package
    and provides lookup by step type.
    """
    
    _instance = None
    _steps: dict[str, Type[WorkflowStep]] = {}
    _discovered = False
    
    def __new__(cls):
        """Singleton pattern."""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    @classmethod
    def discover_steps(cls) -> None:
        """
        Discover and register all step classes in the steps package.
        
        This method scans all modules in the steps package and
        registers any class that inherits from WorkflowStep.
        """
        if cls._discovered:
            return
        
        # Get the path to the steps package
        package_path = Path(__file__).parent
        
        # Iterate through all modules in the package
        for _, module_name, _ in pkgutil.iter_modules([str(package_path)]):
            if module_name == "base":
                continue
            
            try:
                # Import the module
                module = importlib.import_module(f".{module_name}", package=__name__)
                
                # Find all WorkflowStep subclasses in the module
                for attr_name in dir(module):
                    attr = getattr(module, attr_name)
                    
                    # Check if it's a class that inherits from WorkflowStep
                    if (isinstance(attr, type) and 
                        issubclass(attr, WorkflowStep) and 
                        attr is not WorkflowStep and
                        attr.step_type):  # Must have a step_type defined
                        
                        cls.register(attr)
                        
            except Exception as e:
                print(f"Error loading step module {module_name}: {e}")
        
        cls._discovered = True
    
    @classmethod
    def register(cls, step_class: Type[WorkflowStep]) -> None:
        """
        Register a step class.
        
        Args:
            step_class: The WorkflowStep subclass to register
        """
        if not step_class.step_type:
            raise ValueError(f"Step class {step_class.__name__} must define step_type")
        
        cls._steps[step_class.step_type] = step_class
    
    @classmethod
    def get(cls, step_type: str) -> Type[WorkflowStep] | None:
        """
        Get a step class by type.
        
        Args:
            step_type: The step type identifier
            
        Returns:
            The step class or None if not found
        """
        cls.discover_steps()
        return cls._steps.get(step_type)
    
    @classmethod
    def get_all(cls) -> dict[str, Type[WorkflowStep]]:
        """
        Get all registered step classes.
        
        Returns:
            Dictionary mapping step types to step classes
        """
        cls.discover_steps()
        return cls._steps.copy()
    
    @classmethod
    def get_all_metadata(cls) -> list[dict]:
        """
        Get metadata for all registered steps.
        
        Returns:
            List of step metadata dictionaries for the frontend
        """
        cls.discover_steps()
        return [step_class.get_metadata() for step_class in cls._steps.values()]
    
    @classmethod
    def create_step(cls, step_type: str, config: dict, log_fn) -> WorkflowStep | None:
        """
        Create an instance of a step.
        
        Args:
            step_type: The step type identifier
            config: Step configuration dictionary
            log_fn: Logging function
            
        Returns:
            Step instance or None if step type not found
        """
        step_class = cls.get(step_type)
        if step_class:
            return step_class(config, log_fn)
        return None


# Convenience functions
def get_step_registry() -> StepRegistry:
    """Get the step registry singleton."""
    return StepRegistry()


def get_available_steps() -> list[dict]:
    """Get metadata for all available steps."""
    return StepRegistry.get_all_metadata()


__all__ = [
    'WorkflowStep',
    'StepResult', 
    'StepConfigField',
    'StepRegistry',
    'get_step_registry',
    'get_available_steps',
]

