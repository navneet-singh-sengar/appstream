"""
WebSocket event handlers for real-time communication.
"""

from flask import request
from flask_socketio import emit


def register_handlers(socketio, app):
    """Register all WebSocket event handlers."""
    
    @socketio.on('connect')
    def handle_connect():
        """Handle client connection."""
        print(f"Client connected: {request.sid}")
        emit('connected', {'status': 'connected'})

    @socketio.on('disconnect')
    def handle_disconnect():
        """Handle client disconnection."""
        print(f"Client disconnected: {request.sid}")

    @socketio.on('join_build')
    def handle_join_build(data):
        """Handle client joining a specific build session."""
        build_id = data.get('build_id')
        if build_id:
            print(f"Client {request.sid} joined build {build_id}")
            emit('joined_build', {'build_id': build_id, 'status': 'joined'})

    @socketio.on('join_flutter_run')
    def handle_join_flutter_run():
        """Handle client joining Flutter run session."""
        print(f"Client {request.sid} joined Flutter run session")
        
        with app.app_context():
            flutter_run_service = app.extensions.get('flutter_run_service')
            if flutter_run_service:
                status = flutter_run_service.get_status()
                emit('run_status', {
                    'status': 'running' if status['is_running'] else 'stopped',
                    'device': status['device']
                })
