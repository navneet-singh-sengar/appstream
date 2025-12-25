"""
Services package - Business logic layer.

Services are instantiated and stored on the app context
for access via current_app throughout the application.
"""

from .project_service import ProjectService
from .app_service import AppService
from .build_service import BuildService
from .flutter_run_service import FlutterRunService
from .build_history_service import BuildHistoryService
from .workflows import WorkflowExecutor

__all__ = [
    'ProjectService',
    'AppService',
    'BuildService',
    'FlutterRunService',
    'BuildHistoryService',
    'WorkflowExecutor',
]


def init_services(app):
    """Initialize services and store on app context."""
    # Store service classes on app for lazy instantiation
    app.project_service_class = ProjectService
    app.app_service_class = AppService
    app.build_service_class = BuildService
    app.flutter_run_service_class = FlutterRunService
    app.build_history_service_class = BuildHistoryService
    app.workflow_executor_class = WorkflowExecutor
    
    # Store singleton instances
    app.extensions['project_service'] = ProjectService(app)
    app.extensions['app_service'] = AppService(app)
    app.extensions['build_service'] = BuildService(app)
    app.extensions['flutter_run_service'] = FlutterRunService(app)
    app.extensions['build_history_service'] = BuildHistoryService(app)
    app.extensions['workflow_executor'] = WorkflowExecutor(app)


def get_project_service():
    """Get the project service from current app context."""
    from flask import current_app
    return current_app.extensions['project_service']


def get_app_service():
    """Get the app service from current app context."""
    from flask import current_app
    return current_app.extensions['app_service']


def get_build_service():
    """Get the build service from current app context."""
    from flask import current_app
    return current_app.extensions['build_service']


def get_flutter_run_service():
    """Get the flutter run service from current app context."""
    from flask import current_app
    return current_app.extensions['flutter_run_service']


def get_build_history_service():
    """Get the build history service from current app context."""
    from flask import current_app
    return current_app.extensions['build_history_service']


def get_workflow_executor():
    """Get the workflow executor from current app context."""
    from flask import current_app
    return current_app.extensions['workflow_executor']
