"""
AppService - Handles app CRUD operations scoped by project.
"""

import json
import shutil
import uuid
from datetime import datetime


class AppService:
    """Service for managing app data scoped to projects."""
    
    def __init__(self, app=None):
        self.flask_app = app
        self._apps_cache = {}  # Cache apps per project
        
        if app is not None:
            self.init_app(app)
    
    def init_app(self, app):
        """Initialize with Flask app."""
        self.flask_app = app
        self._projects_dir = app.config['PROJECTS_DIR']
    
    def _get_apps_file(self, project_id):
        """Get the apps.json file path for a project."""
        return self._projects_dir / project_id / "apps" / "apps.json"
    
    def _get_apps_dir(self, project_id):
        """Get the apps directory for a project."""
        return self._projects_dir / project_id / "apps"
    
    def _load_apps(self, project_id):
        """Load apps for a specific project."""
        apps_file = self._get_apps_file(project_id)
        
        if apps_file.exists():
            with open(apps_file, 'r') as f:
                return json.load(f)
        return {}
    
    def _save_apps(self, project_id, apps):
        """Save apps for a specific project."""
        apps_file = self._get_apps_file(project_id)
        apps_file.parent.mkdir(parents=True, exist_ok=True)
        
        with open(apps_file, 'w') as f:
            json.dump(apps, f, indent=2)
        
        # Update cache
        self._apps_cache[project_id] = apps
    
    def _get_apps(self, project_id):
        """Get apps for a project (with caching)."""
        if project_id not in self._apps_cache:
            self._apps_cache[project_id] = self._load_apps(project_id)
        return self._apps_cache[project_id]
    
    def add(self, app_data):
        """Add a new app to a project."""
        project_id = app_data.get('project_id')
        
        if not project_id:
            raise ValueError("Project ID is required")
        
        app_name = app_data.get('appName', app_data.get('name', '')).strip()
        
        if not app_name:
            raise ValueError("App name is required")
        
        # Generate unique ID (like project IDs)
        app_id = uuid.uuid4().hex[:8]
        
        apps = self._get_apps(project_id)
        
        # Ensure unique ID (very unlikely collision, but check anyway)
        while app_id in apps:
            app_id = uuid.uuid4().hex[:8]
        
        app_data['id'] = app_id
        app_data['project_id'] = project_id
        app_data['created_at'] = datetime.now().isoformat()
        
        if 'platforms' not in app_data:
            app_data['platforms'] = ['android']
        
        # Create app directory for assets
        app_dir = self._get_apps_dir(project_id) / app_id
        app_dir.mkdir(exist_ok=True)
        (app_dir / "android" / "app_icon").mkdir(parents=True, exist_ok=True)
        
        apps[app_id] = app_data
        self._save_apps(project_id, apps)
        
        return app_id
    
    def get(self, app_id, project_id=None):
        """Get app by ID. If project_id not provided, search all projects."""
        if project_id:
            apps = self._get_apps(project_id)
            return apps.get(app_id)
        
        # Search all projects
        for pid in self._get_all_project_ids():
            apps = self._get_apps(pid)
            if app_id in apps:
                return apps[app_id]
        return None
    
    def _get_all_project_ids(self):
        """Get all project IDs from the projects directory."""
        if not self._projects_dir.exists():
            return []
        return [d.name for d in self._projects_dir.iterdir() if d.is_dir() and (d / "apps").exists()]
    
    def get_all(self):
        """Get all apps across all projects."""
        all_apps = []
        for project_id in self._get_all_project_ids():
            apps = self._get_apps(project_id)
            all_apps.extend(apps.values())
        return all_apps
    
    def get_all_for_project(self, project_id):
        """Get all apps for a specific project."""
        apps = self._get_apps(project_id)
        return list(apps.values())
    
    def update(self, app_id, app_data, project_id=None):
        """Update app configuration."""
        # Find the app if project_id not provided
        if not project_id:
            app = self.get(app_id)
            if app:
                project_id = app.get('project_id')
        
        if not project_id:
            return False
        
        apps = self._get_apps(project_id)
        
        if app_id not in apps:
            return False
        
        # Merge with existing data (app_id stays the same regardless of name change)
        existing_data = apps.get(app_id, {})
        merged_data = {**existing_data, **app_data}
        merged_data['id'] = app_id
        merged_data['project_id'] = project_id
        merged_data['updated_at'] = datetime.now().isoformat()
        
        apps[app_id] = merged_data
        self._save_apps(project_id, apps)
        return True
    
    def delete(self, app_id, project_id=None):
        """Delete an app."""
        # Find the app if project_id not provided
        if not project_id:
            app = self.get(app_id)
            if app:
                project_id = app.get('project_id')
        
        if not project_id:
            return False
        
        apps = self._get_apps(project_id)
        
        if app_id not in apps:
            return False
        
        app_dir = self._get_apps_dir(project_id) / app_id
        if app_dir.exists():
            shutil.rmtree(app_dir)
        
        del apps[app_id]
        self._save_apps(project_id, apps)
        return True
    
    def get_app_dir(self, app_id, project_id=None):
        """Get the directory for an app's assets."""
        if not project_id:
            app = self.get(app_id)
            if app:
                project_id = app.get('project_id')
        
        if not project_id:
            return None
        
        return self._get_apps_dir(project_id) / app_id

