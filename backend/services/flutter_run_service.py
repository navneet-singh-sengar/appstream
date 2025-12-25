"""
FlutterRunService - Manages Flutter run process for live development.
"""

import json
import subprocess
import threading
from datetime import datetime
from pathlib import Path


# Mapping from Flutter's targetPlatform to our platform names
DEVICE_PLATFORM_MAP = {
    # Android platforms
    'android-arm': 'android',
    'android-arm64': 'android',
    'android-x64': 'android',
    'android-x86': 'android',
    'android': 'android',
    # iOS
    'ios': 'ios',
    # macOS desktop
    'darwin': 'macos',
    'darwin-arm64': 'macos',
    'darwin-x64': 'macos',
    # Linux desktop
    'linux-x64': 'linux',
    'linux-arm64': 'linux',
    'linux': 'linux',
    # Windows desktop
    'windows-x64': 'windows',
    'windows': 'windows',
    # Web
    'web-javascript': 'web',
    'chrome': 'web',
    'web': 'web',
}


class FlutterRunService:
    """Service for managing Flutter run process for live development."""
    
    def __init__(self, app=None):
        self.app = app
        self.process = None
        self.device = None
        self.project_id = None
        self.logs = []
        self.is_running = False
        self._log_thread = None
        
        if app is not None:
            self.init_app(app)
    
    def init_app(self, app):
        """Initialize with Flask app."""
        self.app = app
    
    def _get_socketio(self):
        """Get socketio from extensions."""
        from extensions import socketio
        return socketio
    
    def _get_project_service(self):
        """Get project service from app context."""
        return self.app.extensions['project_service']
    
    def _get_app_service(self):
        """Get app service from app context."""
        return self.app.extensions['app_service']
    
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
    
    def _get_project_platforms(self, project_id):
        """
        Get supported platforms for a project by checking platform directories.
        
        Returns a set of platform names (android, ios, web, macos, windows, linux).
        """
        try:
            project_root = self._get_project_root(project_id)
        except ValueError:
            return set()
        
        platform_dirs = {
            'android': 'android',
            'ios': 'ios',
            'web': 'web',
            'macos': 'macos',
            'windows': 'windows',
            'linux': 'linux',
        }
        
        platforms = set()
        for platform, dir_name in platform_dirs.items():
            platform_path = project_root / dir_name
            if platform_path.exists() and platform_path.is_dir():
                platforms.add(platform)
        
        return platforms
    
    def _map_device_platform(self, target_platform):
        """Map Flutter's targetPlatform to our platform name."""
        return DEVICE_PLATFORM_MAP.get(target_platform, None)
    
    def get_devices(self, project_id=None):
        """
        Get list of available Flutter devices.
        
        If project_id is provided, filters devices to only include those
        for platforms that the project supports.
        """
        try:
            # Use project path if provided, otherwise use a temp directory
            cwd = None
            if project_id:
                try:
                    cwd = self._get_project_root(project_id)
                except ValueError:
                    pass
            
            result = subprocess.run(
                ["flutter", "devices", "--machine"],
                capture_output=True,
                text=True,
                cwd=cwd
            )
            if result.returncode != 0:
                return []
            
            devices = json.loads(result.stdout)
            
            # Build device list with platform mapping
            device_list = []
            for d in devices:
                target_platform = d.get("targetPlatform", "unknown")
                platform_type = self._map_device_platform(target_platform)
                
                device_list.append({
                    "id": d.get("id", ""),
                    "name": d.get("name", "Unknown"),
                    "platform": target_platform,
                    "platform_type": platform_type,
                    "isEmulator": d.get("emulator", False)
                })
            
            # Filter by project platforms if project_id is provided
            if project_id:
                supported_platforms = self._get_project_platforms(project_id)
                if supported_platforms:
                    device_list = [
                        d for d in device_list 
                        if d.get("platform_type") in supported_platforms
                    ]
            
            return device_list
        except Exception as e:
            print(f"Error getting devices: {e}")
            return []
    
    def _log_to_console(self, message, level="info"):
        """Log message to console and emit via websocket."""
        timestamp = datetime.now().isoformat()
        log_entry = {
            "timestamp": timestamp,
            "message": message,
            "level": level
        }
        self.logs.append(log_entry)
        print(f"[{timestamp}] {level.upper()}: {message}")
        
        try:
            socketio = self._get_socketio()
            socketio.emit('run_log', {'log_entry': log_entry})
        except Exception as e:
            print(f"Failed to emit log: {e}")
    
    def start(self, device_id, project_id, app_id=None, run_mode='debug'):
        """Start Flutter run on specified device for a project.
        
        Args:
            device_id: The device ID to run on
            project_id: The project ID
            app_id: Optional app ID to get run settings from
            run_mode: Run mode - 'debug', 'profile', or 'release' (default: 'debug')
        """
        if self.is_running:
            raise ValueError("Flutter is already running")
        
        if not project_id:
            raise ValueError("Project ID is required")
        
        project_root = self._get_project_root(project_id)
        
        self.device = device_id
        self.project_id = project_id
        self.logs = []
        self.is_running = True
        
        try:
            # Build command with run mode flag
            mode_flags = {
                'debug': '--debug',
                'profile': '--profile',
                'release': '--release',
            }
            mode_flag = mode_flags.get(run_mode, '--debug')
            cmd = ["flutter", "run", "-d", device_id, mode_flag]
            
            run_settings = None
            device_platform = None
            custom_args = []
            
            # Get run settings from app if provided
            if app_id:
                run_settings = self._get_run_settings(app_id, device_id)
                
                # Get device platform for workflow context
                devices = self.get_devices()
                for d in devices:
                    if d.get('id') == device_id:
                        device_platform = d.get('platform_type')
                        break
            
            # Execute pre-run workflow steps and collect custom args
            if run_settings:
                workflow_config = run_settings.get('workflow', {})
                pre_steps = workflow_config.get('preSteps', [])
                
                if pre_steps:
                    self._log_to_console(f"Running {len(pre_steps)} pre-run step(s)...", "info")
                    
                    # Get app config for context
                    app_service = self._get_app_service()
                    app_config = app_service.get(app_id) if app_id else {}
                    
                    # Build workflow context
                    workflow_context = {
                        "project_id": project_id,
                        "project_root": str(project_root),
                        "app_id": app_id,
                        "app_config": app_config,
                        "device_id": device_id,
                        "platform": device_platform,
                        "run_mode": run_mode,
                    }
                    
                    workflow_executor = self._get_workflow_executor()
                    success, results = workflow_executor.execute_steps(
                        pre_steps, workflow_context, self._log_to_console
                    )
                    
                    if not success:
                        self.is_running = False
                        self.device = None
                        self.project_id = None
                        raise Exception("Pre-run workflow steps failed")
                    
                    # Extract custom args from custom_args steps
                    custom_args = self._extract_custom_args(pre_steps, results)
                    if custom_args:
                        self._log_to_console(f"Collected {len(custom_args)} custom argument(s) from workflow", "info")
                    
                    self._log_to_console("Pre-run steps completed", "success")
            
            # Append custom arguments from workflow steps
            if custom_args:
                cmd.extend(custom_args)
            
            # Log the command being run
            self._log_to_console(f"Starting Flutter run in {run_mode} mode...", "info")
            print(f"Running command: {' '.join(cmd)}")
            
            self.process = subprocess.Popen(
                cmd,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
                cwd=project_root
            )
            
            # Store run settings for post-run steps
            self._current_run_settings = run_settings
            self._current_app_id = app_id
            self._current_device_platform = device_platform
            
            self._log_thread = threading.Thread(target=self._stream_logs, daemon=True)
            self._log_thread.start()
            
            return {"status": "running", "device": device_id, "project_id": project_id}
        except Exception as e:
            self.is_running = False
            self.device = None
            self.project_id = None
            raise e
    
    def _get_run_settings(self, app_id, device_id):
        """Get run settings for the app based on device platform.
        
        Args:
            app_id: The app ID to get settings from
            device_id: The device ID to determine platform
            
        Returns:
            Run settings dict with 'workflow', or None
        """
        try:
            app_service = self._get_app_service()
            app_config = app_service.get(app_id)
            
            if not app_config:
                return None
            
            build_settings = app_config.get('buildSettings', {})
            if not build_settings:
                return None
            
            # Determine platform from device
            # First, get device info to find its platform
            devices = self.get_devices()
            device_platform = None
            for d in devices:
                if d.get('id') == device_id:
                    device_platform = d.get('platform_type')
                    break
            
            if not device_platform:
                return None
            
            # Get platform-specific run settings
            platform_settings = build_settings.get(device_platform, {})
            return platform_settings.get('run', {})
            
        except Exception as e:
            print(f"Error getting run settings: {e}")
            return None
    
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
    
    def _stream_logs(self):
        """Stream logs from Flutter process."""
        try:
            for line in self.process.stdout:
                line = line.strip()
                if line:
                    log_entry = {
                        "timestamp": datetime.now().isoformat(),
                        "message": line,
                        "level": self._detect_log_level(line)
                    }
                    self.logs.append(log_entry)
                    
                    try:
                        socketio = self._get_socketio()
                        socketio.emit('run_log', {'log_entry': log_entry})
                    except Exception as e:
                        print(f"Failed to emit flutter log: {e}")
            
            self.is_running = False
            self.device = None
            self.project_id = None
            try:
                socketio = self._get_socketio()
                socketio.emit('run_status', {'status': 'stopped', 'device': None})
            except Exception:
                pass
        except Exception as e:
            print(f"Log streaming error: {e}")
            self.is_running = False
    
    def _detect_log_level(self, line):
        """Detect log level from line content."""
        line_lower = line.lower()
        if 'error' in line_lower or 'exception' in line_lower:
            return 'error'
        elif 'warning' in line_lower or 'warn' in line_lower:
            return 'warning'
        elif 'success' in line_lower or 'built' in line_lower or 'synced' in line_lower:
            return 'success'
        elif line.startswith('I/') or line.startswith('D/') or 'info' in line_lower:
            return 'info'
        return 'terminal'
    
    def stop(self):
        """Stop Flutter run process."""
        if not self.is_running or not self.process:
            return {"status": "stopped"}
        
        try:
            self.process.stdin.write('q\n')
            self.process.stdin.flush()
            self.process.wait(timeout=10)
        except subprocess.TimeoutExpired:
            self.process.kill()
        except Exception as e:
            print(f"Error stopping flutter: {e}")
            self.process.kill()
        
        # Execute post-run workflow steps
        run_settings = getattr(self, '_current_run_settings', None)
        if run_settings:
            workflow_config = run_settings.get('workflow', {})
            post_steps = workflow_config.get('postSteps', [])
            
            if post_steps:
                self._log_to_console(f"Running {len(post_steps)} post-run step(s)...", "info")
                
                try:
                    # Get app config for context
                    app_id = getattr(self, '_current_app_id', None)
                    app_service = self._get_app_service()
                    app_config = app_service.get(app_id) if app_id else {}
                    
                    # Build workflow context
                    project_root = self._get_project_root(self.project_id) if self.project_id else None
                    workflow_context = {
                        "project_id": self.project_id,
                        "project_root": str(project_root) if project_root else None,
                        "app_id": app_id,
                        "app_config": app_config,
                        "device_id": self.device,
                        "platform": getattr(self, '_current_device_platform', None),
                    }
                    
                    workflow_executor = self._get_workflow_executor()
                    success, results = workflow_executor.execute_steps(
                        post_steps, workflow_context, self._log_to_console
                    )
                    
                    if success:
                        self._log_to_console("Post-run steps completed", "success")
                    else:
                        self._log_to_console("Warning: Some post-run steps failed", "warning")
                except Exception as e:
                    self._log_to_console(f"Error running post-run steps: {e}", "error")
        
        # Clean up state
        self.is_running = False
        self.device = None
        self.project_id = None
        self._current_run_settings = None
        self._current_app_id = None
        self._current_device_platform = None
        
        return {"status": "stopped"}
    
    def hot_reload(self):
        """Trigger hot reload."""
        if not self.is_running or not self.process:
            raise ValueError("Flutter is not running")
        
        try:
            self.process.stdin.write('r\n')
            self.process.stdin.flush()
            return {"status": "reloading"}
        except Exception as e:
            raise ValueError(f"Hot reload failed: {e}")
    
    def hot_restart(self):
        """Trigger hot restart."""
        if not self.is_running or not self.process:
            raise ValueError("Flutter is not running")
        
        try:
            self.process.stdin.write('R\n')
            self.process.stdin.flush()
            return {"status": "restarting"}
        except Exception as e:
            raise ValueError(f"Hot restart failed: {e}")
    
    def get_status(self):
        """Get current Flutter run status."""
        return {
            "is_running": self.is_running,
            "device": self.device,
            "project_id": self.project_id
        }
    
    def get_logs(self):
        """Get all logs."""
        return self.logs
    
    def clean_project(self, project_id):
        """Run flutter clean on a project.
        
        Args:
            project_id: The project ID to clean
            
        Returns:
            dict with status and message
        """
        project_root = self._get_project_root(project_id)
        
        try:
            result = subprocess.run(
                ["flutter", "clean"],
                cwd=project_root,
                capture_output=True,
                text=True,
                timeout=120  # 2 minute timeout
            )
            
            if result.returncode == 0:
                return {
                    "status": "success",
                    "message": "Flutter clean completed successfully",
                    "output": result.stdout
                }
            else:
                return {
                    "status": "error",
                    "message": "Flutter clean failed",
                    "output": result.stderr or result.stdout
                }
        except subprocess.TimeoutExpired:
            raise ValueError("Flutter clean timed out")
        except Exception as e:
            raise ValueError(f"Flutter clean failed: {e}")
    
    def clean_projects(self, project_ids):
        """Run flutter clean on multiple projects.
        
        Args:
            project_ids: List of project IDs to clean
            
        Returns:
            List of results with project_id, status, and message for each
        """
        results = []
        
        for project_id in project_ids:
            try:
                # Get project name for better reporting
                project_service = self._get_project_service()
                project = project_service.get(project_id)
                project_name = project.get('name', project_id) if project else project_id
                
                result = self.clean_project(project_id)
                results.append({
                    "project_id": project_id,
                    "project_name": project_name,
                    "status": result.get("status", "error"),
                    "message": result.get("message", "Unknown error"),
                })
            except Exception as e:
                results.append({
                    "project_id": project_id,
                    "project_name": project_id,
                    "status": "error",
                    "message": str(e),
                })
        
        return results
    
    def get_project_info(self, project_id):
        """Get detailed information about a Flutter project.
        
        Args:
            project_id: The project ID
            
        Returns:
            dict with pubspec info, SDK versions, platforms, and stats
        """
        project_root = self._get_project_root(project_id)
        
        info = {
            "pubspec": self._get_pubspec_info(project_root),
            "sdk_versions": self._get_sdk_versions(project_root),
            "platforms": list(self._get_project_platforms(project_id)),
            "stats": self._get_project_stats(project_root),
        }
        
        return info
    
    def _get_pubspec_info(self, project_root):
        """Parse pubspec.yaml and extract key information."""
        pubspec_path = project_root / "pubspec.yaml"
        
        if not pubspec_path.exists():
            return None
        
        try:
            import yaml
            with open(pubspec_path, 'r') as f:
                pubspec = yaml.safe_load(f)
            
            dependencies = pubspec.get('dependencies', {})
            dev_dependencies = pubspec.get('dev_dependencies', {})
            
            # Remove flutter SDK dependency from count
            dep_count = len([k for k in dependencies.keys() if k != 'flutter'])
            dev_dep_count = len(dev_dependencies)
            
            return {
                "name": pubspec.get('name', 'Unknown'),
                "version": pubspec.get('version', '0.0.0'),
                "description": pubspec.get('description', ''),
                "dependencies_count": dep_count,
                "dev_dependencies_count": dev_dep_count,
            }
        except Exception as e:
            print(f"Error parsing pubspec.yaml: {e}")
            return None
    
    def _get_sdk_versions(self, project_root):
        """Get Flutter and Dart SDK versions."""
        try:
            result = subprocess.run(
                ["flutter", "--version", "--machine"],
                cwd=project_root,
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode == 0:
                version_info = json.loads(result.stdout)
                return {
                    "flutter": version_info.get('frameworkVersion', 'Unknown'),
                    "dart": version_info.get('dartSdkVersion', 'Unknown').split(' ')[0],
                    "channel": version_info.get('channel', 'Unknown'),
                }
        except Exception as e:
            print(f"Error getting SDK versions: {e}")
        
        return {
            "flutter": "Unknown",
            "dart": "Unknown",
            "channel": "Unknown",
        }
    
    def _get_project_stats(self, project_root):
        """Get project statistics (file counts, lines of code)."""
        stats = {
            "dart_files": 0,
            "total_lines": 0,
        }
        
        try:
            lib_dir = project_root / "lib"
            if lib_dir.exists():
                for dart_file in lib_dir.rglob("*.dart"):
                    stats["dart_files"] += 1
                    try:
                        with open(dart_file, 'r', encoding='utf-8', errors='ignore') as f:
                            stats["total_lines"] += sum(1 for _ in f)
                    except Exception:
                        pass
            
            # Also count test files
            test_dir = project_root / "test"
            if test_dir.exists():
                for dart_file in test_dir.rglob("*.dart"):
                    stats["dart_files"] += 1
                    try:
                        with open(dart_file, 'r', encoding='utf-8', errors='ignore') as f:
                            stats["total_lines"] += sum(1 for _ in f)
                    except Exception:
                        pass
        except Exception as e:
            print(f"Error getting project stats: {e}")
        
        return stats
