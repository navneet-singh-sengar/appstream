"""
FlutterRunService - Manages Flutter run process for live development.
"""

import json
import shlex
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
    
    def start(self, device_id, project_id, app_id=None):
        """Start Flutter run on specified device for a project.
        
        Args:
            device_id: The device ID to run on
            project_id: The project ID
            app_id: Optional app ID to get run settings from
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
            cmd = ["flutter", "run", "-d", device_id]
            
            # Get run settings from app if provided
            if app_id:
                run_settings = self._get_run_settings(app_id, device_id)
                if run_settings:
                    # Add custom args - handle both array and legacy string format
                    custom_args = run_settings.get('args', [])
                    if isinstance(custom_args, str):
                        custom_args = custom_args.strip()
                        if custom_args:
                            try:
                                cmd.extend(shlex.split(custom_args))
                            except Exception as e:
                                print(f"Failed to parse custom run args: {e}")
                    elif isinstance(custom_args, list):
                        for arg in custom_args:
                            if arg and arg.strip():
                                cmd.append(arg.strip())
                    
                    # Add dart defines - handle both array and legacy string format
                    dart_defines = run_settings.get('dartDefines', [])
                    if isinstance(dart_defines, str):
                        dart_defines = dart_defines.strip()
                        if dart_defines:
                            for define in dart_defines.split('\n'):
                                define = define.strip()
                                if define:
                                    cmd.append(f"--dart-define={define}")
                    elif isinstance(dart_defines, list):
                        for define in dart_defines:
                            if define and define.strip():
                                cmd.append(f"--dart-define={define.strip()}")
            
            # Log the command being run
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
            Run settings dict with 'args' and 'dartDefines', or None
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
        
        self.is_running = False
        self.device = None
        self.project_id = None
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
