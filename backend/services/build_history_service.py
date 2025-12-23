"""
BuildHistoryService - Stores and retrieves build history records for apps.
"""

import json
import os
from datetime import datetime
from pathlib import Path


class BuildHistoryService:
    """Service for managing build history records."""
    
    def __init__(self, app=None):
        self.app = app
        
        if app is not None:
            self.init_app(app)
    
    def init_app(self, app):
        """Initialize with Flask app."""
        self.app = app
        self._projects_dir = app.config['PROJECTS_DIR']
        self._build_output_dir = app.config['BUILD_OUTPUT_DIR']
    
    def _get_history_file(self, project_id, app_id):
        """Get the build history file path for an app."""
        return self._projects_dir / project_id / "apps" / app_id / "build_history.json"
    
    def _load_history(self, project_id, app_id):
        """Load build history for an app."""
        history_file = self._get_history_file(project_id, app_id)
        
        if history_file.exists():
            with open(history_file, 'r') as f:
                return json.load(f)
        return []
    
    def _save_history(self, project_id, app_id, history):
        """Save build history for an app."""
        history_file = self._get_history_file(project_id, app_id)
        history_file.parent.mkdir(parents=True, exist_ok=True)
        
        with open(history_file, 'w') as f:
            json.dump(history, f, indent=2)
    
    def add_record(self, project_id, app_id, build_data):
        """
        Add a build record to history.
        
        Args:
            project_id: The project ID
            app_id: The app ID
            build_data: Dict containing build information:
                - build_id: Unique build identifier
                - platform: Build platform (android, ios, web, etc.)
                - build_type: release or debug
                - output_type: apk, appbundle, ipa, web, executable
                - status: success or error
                - filename: Output filename (for successful builds)
                - error_message: Error message (for failed builds)
                - duration: Build duration in seconds (optional)
        """
        history = self._load_history(project_id, app_id)
        
        record = {
            "build_id": build_data.get("build_id"),
            "timestamp": datetime.now().isoformat(),
            "platform": build_data.get("platform"),
            "build_type": build_data.get("build_type"),
            "output_type": build_data.get("output_type"),
            "status": build_data.get("status"),
            "filename": build_data.get("filename"),
            "error_message": build_data.get("error_message"),
            "duration": build_data.get("duration"),
        }
        
        # Add to beginning of list (newest first)
        history.insert(0, record)
        
        # Keep only last 50 records
        history = history[:50]
        
        self._save_history(project_id, app_id, history)
        return record
    
    def get_history(self, project_id, app_id, limit=20):
        """
        Get build history for an app.
        
        Args:
            project_id: The project ID
            app_id: The app ID
            limit: Maximum number of records to return
            
        Returns:
            List of build records, newest first
        """
        history = self._load_history(project_id, app_id)
        
        # Check if output files still exist
        for record in history:
            if record.get("filename") and record.get("status") == "success":
                output_path = self._build_output_dir / record["filename"]
                record["file_exists"] = output_path.exists()
            else:
                record["file_exists"] = False
        
        return history[:limit]
    
    def get_record(self, project_id, app_id, build_id):
        """Get a specific build record."""
        history = self._load_history(project_id, app_id)
        
        for record in history:
            if record.get("build_id") == build_id:
                if record.get("filename") and record.get("status") == "success":
                    output_path = self._build_output_dir / record["filename"]
                    record["file_exists"] = output_path.exists()
                else:
                    record["file_exists"] = False
                return record
        
        return None
    
    def delete_record(self, project_id, app_id, build_id, delete_file=True):
        """
        Delete a build record and optionally its output file.
        
        Args:
            project_id: The project ID
            app_id: The app ID
            build_id: The build ID to delete
            delete_file: Whether to delete the output file as well
            
        Returns:
            True if record was deleted, False if not found
        """
        history = self._load_history(project_id, app_id)
        
        for i, record in enumerate(history):
            if record.get("build_id") == build_id:
                # Delete output file if requested
                if delete_file and record.get("filename"):
                    output_path = self._build_output_dir / record["filename"]
                    if output_path.exists():
                        output_path.unlink()
                
                # Remove record from history
                history.pop(i)
                self._save_history(project_id, app_id, history)
                return True
        
        return False
    
    def clear_history(self, project_id, app_id, delete_files=True):
        """
        Clear all build history for an app.
        
        Args:
            project_id: The project ID
            app_id: The app ID
            delete_files: Whether to delete all output files as well
        """
        if delete_files:
            history = self._load_history(project_id, app_id)
            for record in history:
                if record.get("filename"):
                    output_path = self._build_output_dir / record["filename"]
                    if output_path.exists():
                        output_path.unlink()
        
        self._save_history(project_id, app_id, [])

