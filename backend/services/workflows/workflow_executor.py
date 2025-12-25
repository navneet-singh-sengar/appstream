"""
WorkflowExecutor - Executes workflow steps sequentially.

Handles step instantiation, execution, logging, and error handling
with real-time updates via WebSocket.
"""

import uuid
from datetime import datetime
from pathlib import Path
from typing import Callable, Optional

from .steps import StepRegistry, StepResult


class WorkflowExecutor:
    """
    Executes workflow steps in sequence.
    
    Provides real-time logging via WebSocket and handles
    step failures with configurable behavior.
    """
    
    def __init__(self, app=None):
        self.flask_app = app
        self._current_run_id: Optional[str] = None
        self._current_workflow_id: Optional[str] = None
        self._is_running = False
        self._should_stop = False
        self._run_logs: dict[str, list] = {}
        
        if app is not None:
            self.init_app(app)
    
    def init_app(self, app):
        """Initialize with Flask app."""
        self.flask_app = app
        self._projects_dir = app.config['PROJECTS_DIR']
    
    def _get_socketio(self):
        """Get socketio from extensions."""
        from extensions import socketio
        return socketio
    
    def _get_project_service(self):
        """Get project service from app context."""
        return self.flask_app.extensions['project_service']
    
    def _get_app_service(self):
        """Get app service from app context."""
        return self.flask_app.extensions['app_service']
    
    def _get_workflow_service(self):
        """Get workflow service from app context."""
        return self.flask_app.extensions['workflow_service']
    
    def _log(self, run_id: str, message: str, level: str = "info", 
             step_id: Optional[str] = None, step_index: Optional[int] = None) -> None:
        """
        Log a message and emit via WebSocket.
        
        Args:
            run_id: The workflow run identifier
            message: The message to log
            level: Log level ('info', 'success', 'warning', 'error', 'terminal')
            step_id: Optional step identifier
            step_index: Optional step index (0-based)
        """
        timestamp = datetime.now().isoformat()
        log_entry = {
            "timestamp": timestamp,
            "message": message,
            "level": level,
            "step_id": step_id,
            "step_index": step_index,
        }
        
        if run_id not in self._run_logs:
            self._run_logs[run_id] = []
        self._run_logs[run_id].append(log_entry)
        
        print(f"[{timestamp}] [{level.upper()}] {message}")
        
        try:
            socketio = self._get_socketio()
            socketio.emit('workflow_log', {
                'run_id': run_id,
                'log_entry': log_entry,
            })
        except Exception as e:
            print(f"Failed to emit workflow log via WebSocket: {e}")
    
    def _emit_step_status(self, run_id: str, step_id: str, step_index: int,
                          status: str, result: Optional[StepResult] = None) -> None:
        """
        Emit step status update via WebSocket.
        
        Args:
            run_id: The workflow run identifier
            step_id: The step identifier
            step_index: The step index (0-based)
            status: Step status ('pending', 'running', 'success', 'error', 'skipped')
            result: Optional step result
        """
        try:
            socketio = self._get_socketio()
            socketio.emit('workflow_step_status', {
                'run_id': run_id,
                'step_id': step_id,
                'step_index': step_index,
                'status': status,
                'result': {
                    'success': result.success,
                    'message': result.message,
                    'error': result.error,
                } if result else None,
            })
        except Exception as e:
            print(f"Failed to emit step status via WebSocket: {e}")
    
    def _emit_workflow_status(self, run_id: str, status: str, 
                               message: Optional[str] = None) -> None:
        """
        Emit workflow status update via WebSocket.
        
        Args:
            run_id: The workflow run identifier
            status: Workflow status ('running', 'success', 'error', 'stopped')
            message: Optional status message
        """
        try:
            socketio = self._get_socketio()
            socketio.emit('workflow_status', {
                'run_id': run_id,
                'status': status,
                'message': message,
            })
        except Exception as e:
            print(f"Failed to emit workflow status via WebSocket: {e}")
    
    def execute(self, project_id: str, app_id: str, workflow_id: str,
                stop_on_error: bool = True, env: Optional[dict] = None) -> dict:
        """
        Execute a workflow.
        
        Args:
            project_id: The project identifier
            app_id: The app identifier
            workflow_id: The workflow identifier
            stop_on_error: Stop execution if a step fails (default: True)
            env: Optional environment variables to pass to steps
            
        Returns:
            Execution result dictionary
        """
        run_id = str(uuid.uuid4())
        self._current_run_id = run_id
        self._current_workflow_id = workflow_id
        self._is_running = True
        self._should_stop = False
        self._run_logs[run_id] = []
        
        start_time = datetime.now()
        
        try:
            # Get workflow configuration
            workflow_service = self._get_workflow_service()
            workflow = workflow_service.get(project_id, app_id, workflow_id)
            
            if not workflow:
                raise ValueError(f"Workflow not found: {workflow_id}")
            
            # Get project and app info
            project_service = self._get_project_service()
            app_service = self._get_app_service()
            
            project = project_service.get(project_id)
            app_config = app_service.get(app_id, project_id)
            
            if not project:
                raise ValueError(f"Project not found: {project_id}")
            if not app_config:
                raise ValueError(f"App not found: {app_id}")
            
            project_root = Path(project['path'])
            
            # Build execution context
            context = {
                "project_id": project_id,
                "project_root": str(project_root),
                "app_id": app_id,
                "app_config": app_config,
                "workflow_id": workflow_id,
                "run_id": run_id,
                "env": env or {},
            }
            
            self._log(run_id, f"Starting workflow: {workflow['name']}", "info")
            self._emit_workflow_status(run_id, "running", f"Starting workflow: {workflow['name']}")
            
            steps = workflow.get("steps", [])
            if not steps:
                self._log(run_id, "Workflow has no steps", "warning")
                return self._build_result(run_id, "success", "Workflow has no steps", start_time, [])
            
            self._log(run_id, f"Executing {len(steps)} step(s)", "info")
            
            step_results = []
            failed = False
            
            for index, step_config in enumerate(steps):
                if self._should_stop:
                    self._log(run_id, "Workflow stopped by user", "warning")
                    self._emit_workflow_status(run_id, "stopped", "Workflow stopped by user")
                    return self._build_result(run_id, "stopped", "Stopped by user", start_time, step_results)
                
                step_id = step_config.get("id", f"step_{index}")
                step_type = step_config.get("type")
                step_name = step_config.get("name") or step_type
                step_config_data = step_config.get("config", {})
                
                self._log(run_id, f"Step {index + 1}/{len(steps)}: {step_name}", "info", step_id, index)
                self._emit_step_status(run_id, step_id, index, "running")
                
                # Create step instance
                def step_log_fn(message: str, level: str = "info"):
                    self._log(run_id, message, level, step_id, index)
                
                step_instance = StepRegistry.create_step(step_type, step_config_data, step_log_fn)
                
                if not step_instance:
                    error_msg = f"Unknown step type: {step_type}"
                    self._log(run_id, error_msg, "error", step_id, index)
                    result = StepResult(success=False, message=error_msg, error=error_msg)
                    step_results.append({"step_id": step_id, "result": result})
                    self._emit_step_status(run_id, step_id, index, "error", result)
                    
                    if stop_on_error:
                        failed = True
                        break
                    continue
                
                # Validate step configuration
                is_valid, validation_error = step_instance.validate()
                if not is_valid:
                    error_msg = f"Step validation failed: {validation_error}"
                    self._log(run_id, error_msg, "error", step_id, index)
                    result = StepResult(success=False, message=error_msg, error=validation_error)
                    step_results.append({"step_id": step_id, "result": result})
                    self._emit_step_status(run_id, step_id, index, "error", result)
                    
                    if stop_on_error:
                        failed = True
                        break
                    continue
                
                # Execute step
                try:
                    result = step_instance.execute(context)
                    step_results.append({"step_id": step_id, "result": result})
                    
                    if result.success:
                        self._log(run_id, f"Step completed: {result.message}", "success", step_id, index)
                        self._emit_step_status(run_id, step_id, index, "success", result)
                    else:
                        self._log(run_id, f"Step failed: {result.message}", "error", step_id, index)
                        self._emit_step_status(run_id, step_id, index, "error", result)
                        
                        if stop_on_error:
                            failed = True
                            break
                            
                except Exception as e:
                    error_msg = f"Step execution error: {str(e)}"
                    self._log(run_id, error_msg, "error", step_id, index)
                    result = StepResult(success=False, message=error_msg, error=str(e))
                    step_results.append({"step_id": step_id, "result": result})
                    self._emit_step_status(run_id, step_id, index, "error", result)
                    
                    if stop_on_error:
                        failed = True
                        break
            
            # Mark remaining steps as skipped if we stopped early
            if failed or self._should_stop:
                for remaining_index in range(len(step_results), len(steps)):
                    remaining_step = steps[remaining_index]
                    remaining_id = remaining_step.get("id", f"step_{remaining_index}")
                    self._emit_step_status(run_id, remaining_id, remaining_index, "skipped")
            
            # Determine final status
            if failed:
                status = "error"
                message = "Workflow failed"
            else:
                status = "success"
                message = "Workflow completed successfully"
            
            self._log(run_id, message, "success" if status == "success" else "error")
            self._emit_workflow_status(run_id, status, message)
            
            return self._build_result(run_id, status, message, start_time, step_results)
            
        except Exception as e:
            error_msg = f"Workflow execution error: {str(e)}"
            self._log(run_id, error_msg, "error")
            self._emit_workflow_status(run_id, "error", error_msg)
            return self._build_result(run_id, "error", error_msg, start_time, [])
            
        finally:
            self._is_running = False
            self._current_run_id = None
            self._current_workflow_id = None
    
    def stop(self) -> dict:
        """
        Stop the current workflow execution.
        
        Returns:
            Status dictionary
        """
        if self._is_running and self._current_run_id:
            self._should_stop = True
            return {
                "status": "stopping",
                "run_id": self._current_run_id,
            }
        return {
            "status": "no_active_workflow",
        }
    
    def get_status(self) -> dict:
        """
        Get current execution status.
        
        Returns:
            Status dictionary
        """
        return {
            "is_running": self._is_running,
            "run_id": self._current_run_id,
            "workflow_id": self._current_workflow_id,
        }
    
    def get_logs(self, run_id: str) -> list:
        """
        Get logs for a workflow run.
        
        Args:
            run_id: The workflow run identifier
            
        Returns:
            List of log entries
        """
        return self._run_logs.get(run_id, [])
    
    def _build_result(self, run_id: str, status: str, message: str,
                      start_time: datetime, step_results: list) -> dict:
        """Build the execution result dictionary."""
        end_time = datetime.now()
        duration = int((end_time - start_time).total_seconds())
        
        return {
            "run_id": run_id,
            "status": status,
            "message": message,
            "start_time": start_time.isoformat(),
            "end_time": end_time.isoformat(),
            "duration": duration,
            "step_results": [
                {
                    "step_id": sr["step_id"],
                    "success": sr["result"].success,
                    "message": sr["result"].message,
                    "error": sr["result"].error,
                    "output": sr["result"].output,
                }
                for sr in step_results
            ],
            "logs": self._run_logs.get(run_id, []),
        }
    
    def execute_steps(self, steps: list, context: dict, 
                      log_fn: Callable[[str, str], None],
                      stop_on_error: bool = True) -> tuple[bool, list]:
        """
        Execute a list of workflow steps directly.
        
        This is a simpler interface for executing pre/post build/run steps
        without requiring a full workflow configuration.
        
        Args:
            steps: List of step configurations
            context: Execution context dictionary
            log_fn: Logging function (message, level) -> None
            stop_on_error: Stop execution if a step fails (default: True)
            
        Returns:
            Tuple of (success: bool, results: list)
        """
        if not steps:
            return True, []
        
        results = []
        all_success = True
        
        for index, step_config in enumerate(steps):
            step_id = step_config.get("id", f"step_{index}")
            step_type = step_config.get("type")
            step_name = step_config.get("name") or step_type
            step_config_data = step_config.get("config", {})
            
            log_fn(f"Executing step {index + 1}/{len(steps)}: {step_name}", "info")
            
            # Create step-specific logger
            def step_log_fn(message: str, level: str = "info"):
                log_fn(f"  [{step_name}] {message}", level)
            
            # Create step instance
            step_instance = StepRegistry.create_step(step_type, step_config_data, step_log_fn)
            
            if not step_instance:
                error_msg = f"Unknown step type: {step_type}"
                log_fn(error_msg, "error")
                result = StepResult(success=False, message=error_msg, error=error_msg)
                results.append({"step_id": step_id, "result": result})
                all_success = False
                
                if stop_on_error:
                    break
                continue
            
            # Validate step configuration
            is_valid, validation_error = step_instance.validate()
            if not is_valid:
                error_msg = f"Step validation failed: {validation_error}"
                log_fn(error_msg, "error")
                result = StepResult(success=False, message=error_msg, error=validation_error)
                results.append({"step_id": step_id, "result": result})
                all_success = False
                
                if stop_on_error:
                    break
                continue
            
            # Execute step
            try:
                result = step_instance.execute(context)
                results.append({"step_id": step_id, "result": result})
                
                if result.success:
                    log_fn(f"Step completed: {result.message}", "success")
                else:
                    log_fn(f"Step failed: {result.message}", "error")
                    all_success = False
                    
                    if stop_on_error:
                        break
                        
            except Exception as e:
                error_msg = f"Step execution error: {str(e)}"
                log_fn(error_msg, "error")
                result = StepResult(success=False, message=error_msg, error=str(e))
                results.append({"step_id": step_id, "result": result})
                all_success = False
                
                if stop_on_error:
                    break
        
        return all_success, results

