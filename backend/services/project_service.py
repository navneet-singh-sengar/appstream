"""
ProjectService - Handles Flutter project management and persistence.
"""

import json
import re
import shutil
import subprocess
import uuid
from datetime import datetime
from pathlib import Path


class ProjectService:
    """Service for managing Flutter projects."""
    
    def __init__(self, app=None):
        self.app = app
        self._projects = None
        
        if app is not None:
            self.init_app(app)
    
    def init_app(self, app):
        """Initialize with Flask app."""
        self.app = app
        self._projects_dir = app.config['PROJECTS_DIR']
        self._projects_file = self._projects_dir / "projects.json"
        
        # Ensure projects directory exists
        self._projects_dir.mkdir(parents=True, exist_ok=True)
    
    @property
    def projects(self):
        """Lazy load projects from file."""
        if self._projects is None:
            self._load_projects()
        return self._projects
    
    def _load_projects(self):
        """Load projects from JSON file."""
        if self._projects_file.exists():
            with open(self._projects_file, 'r') as f:
                self._projects = json.load(f)
        else:
            self._projects = {}
            self._save_projects()
    
    def _save_projects(self):
        """Save projects to JSON file."""
        with open(self._projects_file, 'w') as f:
            json.dump(self._projects, f, indent=2)
    
    def _validate_flutter_project(self, path):
        """Validate that the path is a Flutter project."""
        project_path = Path(path)
        
        if not project_path.exists():
            raise ValueError(f"Path does not exist: {path}")
        
        if not project_path.is_dir():
            raise ValueError(f"Path is not a directory: {path}")
        
        pubspec_path = project_path / "pubspec.yaml"
        if not pubspec_path.exists():
            raise ValueError(f"Not a Flutter project (pubspec.yaml not found): {path}")
        
        return True
    
    def add(self, project_data):
        """Add a new Flutter project."""
        name = project_data.get('name', '').strip()
        path = project_data.get('path', '').strip()
        
        if not name:
            raise ValueError("Project name is required")
        
        if not path:
            raise ValueError("Project path is required")
        
        # Validate Flutter project
        self._validate_flutter_project(path)
        
        # Generate unique ID
        project_id = str(uuid.uuid4())[:8]
        
        # Check if path already registered
        for existing in self.projects.values():
            if existing.get('path') == path:
                raise ValueError(f"Project at this path is already registered: {path}")
        
        project = {
            'id': project_id,
            'name': name,
            'path': path,
            'is_cloned': project_data.get('is_cloned', False),
            'created_at': datetime.now().isoformat()
        }
        
        # Create project data directory for apps
        project_data_dir = self._projects_dir / project_id
        project_data_dir.mkdir(exist_ok=True)
        (project_data_dir / "apps").mkdir(exist_ok=True)
        
        # Initialize empty apps.json
        apps_file = project_data_dir / "apps" / "apps.json"
        with open(apps_file, 'w') as f:
            json.dump({}, f, indent=2)
        
        self._projects[project_id] = project
        self._save_projects()
        
        return project_id
    
    def get(self, project_id):
        """Get project by ID."""
        return self.projects.get(project_id)
    
    def get_all(self):
        """Get all projects."""
        return list(self.projects.values())
    
    def update(self, project_id, project_data):
        """Update project configuration."""
        if project_id not in self.projects:
            return False
        
        name = project_data.get('name', '').strip()
        path = project_data.get('path', '').strip()
        
        if name:
            self._projects[project_id]['name'] = name
        
        if path:
            # Validate new path if changed
            if path != self._projects[project_id].get('path'):
                self._validate_flutter_project(path)
                
                # Check if new path already registered
                for pid, existing in self.projects.items():
                    if pid != project_id and existing.get('path') == path:
                        raise ValueError(f"Project at this path is already registered: {path}")
                
                self._projects[project_id]['path'] = path
        
        self._projects[project_id]['updated_at'] = datetime.now().isoformat()
        self._save_projects()
        return True
    
    def delete(self, project_id, delete_project_folder=False):
        """Delete project and its app configurations.
        
        Args:
            project_id: The ID of the project to delete
            delete_project_folder: If True, also delete the actual project folder.
                                   This is automatically True for cloned projects.
        """
        if project_id not in self.projects:
            return False
        
        project = self._projects[project_id]
        project_path = Path(project.get('path', ''))
        is_cloned = project.get('is_cloned', False)
        
        # Delete the actual project folder if it's a cloned project or explicitly requested
        if (is_cloned or delete_project_folder) and project_path.exists():
            shutil.rmtree(project_path)
        
        # Remove project data directory (apps config)
        project_data_dir = self._projects_dir / project_id
        if project_data_dir.exists():
            shutil.rmtree(project_data_dir)
        
        del self._projects[project_id]
        self._save_projects()
        return True
    
    def get_project_data_dir(self, project_id):
        """Get the data directory for a project."""
        return self._projects_dir / project_id
    
    def get_apps_dir(self, project_id):
        """Get the apps directory for a project."""
        return self._projects_dir / project_id / "apps"
    
    def clone_and_add(self, clone_data):
        """Clone a Git repository and add it as a new Flutter project.
        
        Args:
            clone_data: Dictionary with:
                - repositoryUrl: Git repository URL (required)
                - name: Project name (optional, derived from repo if not provided)
                - destinationPath: Where to clone (optional, defaults to cloned/ subdirectory)
        
        Returns:
            project_id: The ID of the newly added project
        
        Raises:
            ValueError: If clone fails or result is not a valid Flutter project
        """
        from extensions import socketio
        
        def emit_progress(stage, message, progress=None, size_info=None):
            """Emit clone progress to connected clients."""
            socketio.emit('clone_progress', {
                'stage': stage,
                'message': message,
                'progress': progress,
                'size_info': size_info
            })
        
        repository_url = clone_data.get('repositoryUrl', '').strip()
        name = clone_data.get('name', '').strip()
        destination = clone_data.get('destinationPath', '').strip()
        
        if not repository_url:
            raise ValueError("Repository URL is required")
        
        # Use default cloned projects directory if no destination specified
        if not destination:
            destination = str(self._projects_dir / "cloned")
        
        # Ensure destination directory exists
        destination_path = Path(destination)
        destination_path.mkdir(parents=True, exist_ok=True)
        
        # Extract repo name from URL for folder name
        repo_name = repository_url.rstrip('/').split('/')[-1]
        if repo_name.endswith('.git'):
            repo_name = repo_name[:-4]
        
        clone_path = destination_path / repo_name
        
        # Check if destination already exists
        if clone_path.exists():
            raise ValueError(f"Directory already exists: {clone_path}")
        
        # Emit: Starting clone
        emit_progress('cloning', f'Cloning {repo_name}...', 0, None)
        
        # Clone the repository with streaming progress
        try:
            import re
            import select
            import time
            
            process = subprocess.Popen(
                ['git', 'clone', '--depth', '1', '--progress', repository_url, str(clone_path)],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
            # Git outputs progress to stderr
            # Example output:
            # Receiving objects:  45% (1234/2740), 45.00 MiB | 5.20 MiB/s
            # Resolving deltas:  100% (123/123)
            
            progress_pattern = re.compile(
                r'(Receiving objects|Resolving deltas):\s+(\d+)%\s*\((\d+)/(\d+)\)(?:,\s*([\d.]+)\s*(\w+)(?:\s*\|\s*([\d.]+)\s*(\w+)/s)?)?'
            )
            
            start_time = time.time()
            timeout_seconds = 1800  # 30 minutes for large repos
            last_progress = ""
            last_update_time = 0
            
            while True:
                # Check timeout
                if time.time() - start_time > timeout_seconds:
                    process.kill()
                    if clone_path.exists():
                        shutil.rmtree(clone_path)
                    emit_progress('error', 'Clone timed out after 30 minutes', 0, None)
                    raise ValueError("Clone operation timed out after 30 minutes")
                
                # Read stderr line by line (git progress goes to stderr)
                line = process.stderr.readline()
                if not line and process.poll() is not None:
                    break
                
                if line:
                    line = line.strip()
                    match = progress_pattern.search(line)
                    if match:
                        stage = match.group(1)
                        percent = int(match.group(2))
                        current = int(match.group(3))
                        total = int(match.group(4))
                        size_downloaded = match.group(5)
                        size_unit = match.group(6)
                        speed = match.group(7)
                        speed_unit = match.group(8)
                        
                        if stage == "Receiving objects":
                            # Map receiving to 0-60% of total progress
                            overall_progress = int(percent * 0.6)
                            if size_downloaded:
                                size_info = f"{size_downloaded} {size_unit}"
                                if speed:
                                    size_info += f" ({speed} {speed_unit}/s)"
                            else:
                                size_info = f"{current}/{total} objects"
                            
                            # Simplify message since we send size_info separately
                            progress_msg = "Downloading objects..."
                            
                            # Only emit if progress matches specific intervals to avoid spamming
                            # or if it's the first update
                            current_time = time.time()
                            if last_progress != size_info or (current_time - last_update_time > 0.1):
                                emit_progress('downloading', progress_msg, overall_progress, size_info)
                                last_progress = size_info
                                last_update_time = current_time
                                
                        elif stage == "Resolving deltas":
                            # Map resolving to 60-70% of total progress
                            overall_progress = 60 + int(percent * 0.1)
                            emit_progress('resolving', f"Resolving: {percent}%", overall_progress, None)
            
            # Check exit code
            exit_code = process.wait()
            if exit_code != 0:
                stderr_output = process.stderr.read()
                error_msg = stderr_output.strip() if stderr_output else "Unknown error"
                emit_progress('error', f'Clone failed: {error_msg}', 0, None)
                if clone_path.exists():
                    shutil.rmtree(clone_path)
                raise ValueError(f"Failed to clone repository: {error_msg}")
                
        except FileNotFoundError:
            emit_progress('error', 'Git not found', 0, None)
            raise ValueError("Git is not installed or not in PATH")
        
        # Emit: Validating
        emit_progress('validating', 'Validating Flutter project...', 75, None)
        
        # Use repo name as project name if not specified
        if not name:
            name = repo_name.replace('-', ' ').replace('_', ' ').title()
        
        # Emit: Registering
        emit_progress('registering', 'Registering project...', 90, None)
        
        # Add as project (this validates it's a Flutter project)
        try:
            project_id = self.add({'name': name, 'path': str(clone_path), 'is_cloned': True})
            emit_progress('complete', 'Project added successfully!', 100, None)
            return project_id
        except ValueError as e:
            # Clean up cloned directory if validation fails
            if clone_path.exists():
                shutil.rmtree(clone_path)
            emit_progress('error', str(e), 0, None)
            raise ValueError(f"Cloned repository is not a valid Flutter project: {e}")

