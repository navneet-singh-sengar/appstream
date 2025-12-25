"""
BuildService - Orchestrates Flutter build operations across platforms.

This is a slim orchestrator that delegates platform-specific setup
and build handling to the appropriate platform handlers.
"""

import os
import shutil
import subprocess
import uuid
from datetime import datetime
from pathlib import Path

from .platforms import get_handler
from .workflows.workflow_executor import WorkflowExecutor


class BuildService:
    """Service for managing Flutter build operations."""
    
    def __init__(self, app=None):
        self.app = app
        self.build_logs = {}
        self.current_process = None
        self.current_build_id = None
        self._build_start_time = None
        
        if app is not None:
            self.init_app(app)
    
    def init_app(self, app):
        """Initialize with Flask app."""
        self.app = app
        self._projects_dir = app.config['PROJECTS_DIR']
        self._build_output_dir = app.config['BUILD_OUTPUT_DIR']
    
    def _get_socketio(self):
        """Get socketio from extensions."""
        from extensions import socketio
        return socketio
    
    def _get_app_service(self):
        """Get app service from app context."""
        return self.app.extensions['app_service']
    
    def _get_project_service(self):
        """Get project service from app context."""
        return self.app.extensions['project_service']
    
    def _get_build_history_service(self):
        """Get build history service from app context."""
        return self.app.extensions['build_history_service']
    
    def _get_workflow_executor(self):
        """Get workflow executor from app context."""
        return self.app.extensions['workflow_executor']
    
    def _get_project_root(self, project_id):
        """Get the Flutter project root path for a project."""
        project_service = self._get_project_service()
        project = project_service.get(project_id)
        
        if not project:
            raise ValueError(f"Project not found: {project_id}")
        
        return Path(project['path'])
    
    def _get_apps_dir(self, project_id):
        """Get the apps directory for a project."""
        return self._projects_dir / project_id / "apps"
    
    def build(self, app_id, platform="android", build_type="release", output_type="apk"):
        """
        Build for a specific app and platform.
        
        Args:
            app_id: The app identifier
            platform: Target platform ('android', 'ios', 'web', etc.)
            build_type: Build mode ('release' or 'debug')
            output_type: Output format (e.g., 'apk', 'appbundle')
            
        Returns:
            Build result dictionary with output path and status
        """
        app_service = self._get_app_service()
        app_config = app_service.get(app_id)
        
        if not app_config:
            raise ValueError("App not found")
        
        project_id = app_config.get('project_id')
        if not project_id:
            raise ValueError("App is not associated with a project")
        
        project_root = self._get_project_root(project_id)
        apps_dir = self._get_apps_dir(project_id)
        
        supported_platforms = app_config.get('platforms', ['android'])
        if platform not in supported_platforms:
            raise ValueError(f"Platform '{platform}' is not supported by this app")
        
        build_id = str(uuid.uuid4())
        self.build_logs[build_id] = []
        self.current_build_id = build_id
        self._build_start_time = datetime.now()
        
        try:
            # Get platform handler
            handler = get_handler(platform, project_root, apps_dir, self._log)
            handler.set_build_id(build_id)
            
            # Get platform-specific build settings
            platform_settings = app_config.get('buildSettings', {}).get(platform, {})
            build_settings = platform_settings.get('build', {})
            
            # Get workflow steps
            workflow_config = build_settings.get('workflow', {})
            pre_steps = workflow_config.get('preSteps', [])
            post_steps = workflow_config.get('postSteps', [])
            
            # Build context for workflow steps
            workflow_context = {
                "project_id": project_id,
                "project_root": str(project_root),
                "apps_dir": apps_dir,  # For Android setup step to find res.zip
                "app_id": app_id,
                "app_config": app_config,
                "build_id": build_id,
                "platform": platform,
                "build_type": build_type,
                "output_type": output_type,
            }
            
            # Step 1: Execute pre-build workflow steps and collect custom args
            custom_args = []
            if pre_steps:
                self._log(build_id, f"Step 1: Running {len(pre_steps)} pre-build step(s)...", "info")
                workflow_executor = self._get_workflow_executor()
                
                def workflow_log_fn(message, level):
                    self._log(build_id, message, level)
                
                success, results = workflow_executor.execute_steps(
                    pre_steps, workflow_context, workflow_log_fn
                )
                
                if not success:
                    raise Exception("Pre-build workflow steps failed")
                
                # Extract custom args from custom_args steps
                custom_args = self._extract_custom_args(pre_steps, results)
                if custom_args:
                    self._log(build_id, f"Collected {len(custom_args)} custom argument(s) from workflow", "info")
                
                self._log(build_id, "Pre-build steps completed", "success")
            
            # Step 2: Platform-specific setup
            step_num = 2 if pre_steps else 1
            self._log(build_id, f"Step {step_num}: Setting up {platform} configuration...", "info")
            handler.setup(app_id, app_config)
            
            # Step 3: Run Flutter build
            step_num += 1
            self._log(build_id, f"Step {step_num}: Building {platform} {output_type}...", "info")
            
            output_path = self._run_flutter_build(
                handler, build_type, output_type, build_id, project_root, custom_args
            )
            
            # Step 4: Move output to final location
            step_num += 1
            ext = handler.get_output_extension(output_type)
            output_filename = (
                f"{app_config['appName'].replace(' ', '_')}_{platform}_{build_type}_"
                f"{datetime.now().strftime('%Y%m%d_%H%M%S')}{ext}"
            )
            final_output_path = self._build_output_dir / output_filename
            shutil.move(output_path, final_output_path)
            
            # Update context with build output info for post-build steps
            workflow_context["output_path"] = str(final_output_path)
            workflow_context["output_filename"] = output_filename
            
            # Step 5: Execute post-build workflow steps
            if post_steps:
                step_num += 1
                self._log(build_id, f"Step {step_num}: Running {len(post_steps)} post-build step(s)...", "info")
                workflow_executor = self._get_workflow_executor()
                
                def workflow_log_fn(message, level):
                    self._log(build_id, message, level)
                
                success, results = workflow_executor.execute_steps(
                    post_steps, workflow_context, workflow_log_fn
                )
                
                if not success:
                    self._log(build_id, "Warning: Some post-build steps failed", "warning")
                else:
                    self._log(build_id, "Post-build steps completed", "success")
            
            self._log(build_id, "Build completed successfully!", "success")
            
            # Log to build history
            duration = self._get_build_duration()
            self._log_to_history(project_id, app_id, {
                "build_id": build_id,
                "platform": platform,
                "build_type": build_type,
                "output_type": output_type,
                "status": "success",
                "filename": output_filename,
                "duration": duration,
            })
            
            self._reset_build_state()
            
            return {
                "build_id": build_id,
                "output_path": str(final_output_path),
                "filename": output_filename,
                "status": "success",
                "platform": platform,
                "output_type": output_type
            }
            
        except Exception as e:
            self._log(build_id, f"Build failed: {str(e)}", "error")
            
            # Log failed build to history
            duration = self._get_build_duration()
            self._log_to_history(project_id, app_id, {
                "build_id": build_id,
                "platform": platform,
                "build_type": build_type,
                "output_type": output_type,
                "status": "error",
                "error_message": str(e),
                "duration": duration,
            })
            
            self._reset_build_state()
            raise
    
    def stop_build(self):
        """Stop the current build process."""
        if self.current_process:
            try:
                self.current_process.terminate()
                self.current_process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self.current_process.kill()
            
            if self.current_build_id:
                self._log(self.current_build_id, "Build stopped by user", "warning")
            
            self.current_process = None
            self.current_build_id = None
            return {"status": "stopped"}
        return {"status": "no_active_build"}
    
    def get_logs(self, build_id):
        """Get build logs for a specific build."""
        return self.build_logs.get(build_id, [])
    
    def get_status(self):
        """Get current build status and logs."""
        if self.current_build_id:
            return {
                "is_building": True,
                "build_id": self.current_build_id,
                "logs": self.build_logs.get(self.current_build_id, [])
            }
        return {"is_building": False, "build_id": None, "logs": []}
    
    def _log(self, build_id, message, level):
        """Add log entry and emit real-time update."""
        timestamp = datetime.now().isoformat()
        log_entry = {
            "timestamp": timestamp,
            "message": message,
            "level": level
        }
        self.build_logs[build_id].append(log_entry)
        
        print(f"[{timestamp}] {level.upper()}: {message}")
        
        try:
            socketio = self._get_socketio()
            socketio.emit('build_log', {
                'build_id': build_id,
                'log_entry': log_entry
            })
        except Exception as e:
            print(f"Failed to emit log via WebSocket: {e}")
    
    def _run_flutter_build(self, handler, build_type, output_type, build_id, project_root, custom_args=None):
        """
        Run Flutter build command using the platform handler.
        
        Args:
            handler: Platform handler instance
            build_type: Build mode ('release' or 'debug')
            output_type: Output format
            build_id: Current build ID for logging
            project_root: Path to project root
            custom_args: Optional list of custom arguments from workflow steps
            
        Returns:
            Path to the build output
        """
        if custom_args is None:
            custom_args = []
        
        try:
            os.chdir(project_root)
            
            # Flutter clean
            self._run_flutter_command(["flutter", "clean"], build_id, "Flutter clean")
            
            # Flutter pub get
            self._run_flutter_command(["flutter", "pub", "get"], build_id, "Flutter pub get")
            
            # Build command from handler
            build_command = handler.get_build_command(build_type, output_type)
            
            # Append custom arguments from workflow steps
            if custom_args:
                build_command.extend(custom_args)
            
            # Run build command
            self._log(build_id, f"Running command: {' '.join(build_command)}", "info")
            self._run_flutter_command(build_command, build_id, "Flutter build")
            
            self._log(build_id, "Flutter build completed", "success")
            
            # Find build output using handler
            return handler.find_build_output(build_type, output_type)
            
        except subprocess.CalledProcessError as e:
            self._log(build_id, f"Flutter build failed with exit code {e.returncode}", "error")
            raise
        except Exception as e:
            self._log(build_id, f"Build error: {str(e)}", "error")
            raise
    
    def _run_flutter_command(self, command, build_id, description):
        """
        Run a Flutter command and stream output to logs.
        
        Args:
            command: Command list for subprocess
            build_id: Current build ID for logging
            description: Human-readable description of the command
        """
        self._log(build_id, f"Running {description}...", "info")
        
        process = subprocess.Popen(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            universal_newlines=True
        )
        self.current_process = process
        
        for line in process.stdout:
            line = line.strip()
            if line:
                self._log(build_id, line, "terminal")
        
        process.wait()
        if process.returncode != 0:
            raise subprocess.CalledProcessError(process.returncode, command[0])
        
        self._log(build_id, f"{description} completed", "success")
    
    def _get_build_duration(self):
        """Calculate build duration in seconds."""
        if self._build_start_time:
            return int((datetime.now() - self._build_start_time).total_seconds())
        return None
    
    def _log_to_history(self, project_id, app_id, record):
        """Log build result to history service."""
        try:
            history_service = self._get_build_history_service()
            history_service.add_record(project_id, app_id, record)
        except Exception as e:
            print(f"Failed to log build to history: {e}")
    
    def _reset_build_state(self):
        """Reset build state after completion or failure."""
        self.current_build_id = None
        self.current_process = None
        self._build_start_time = None
    
    def _extract_custom_args(self, steps, results):
        """
        Extract custom arguments from workflow step results.
        
        Args:
            steps: List of workflow step configurations
            results: List of step execution results
            
        Returns:
            List of custom arguments to append to the flutter command
        """
        from .workflows.steps.custom_args_step import CustomArgsStep
        
        custom_args = []
        
        for i, step in enumerate(steps):
            if step.get('type') == 'custom_args':
                # Get arguments from step config
                step_config = step.get('config', {})
                args = CustomArgsStep.extract_arguments_from_config(step_config)
                custom_args.extend(args)
        
        return custom_args
