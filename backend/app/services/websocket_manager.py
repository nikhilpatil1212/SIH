import asyncio
import json
from typing import List, Dict, Any
from fastapi import WebSocket

class WebSocketManager:
    """Centralized manager for real-time WebSocket communication."""
    
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message_type: str, payload: Dict[str, Any]):
        """Broadcast event to all connected clients."""
        if not self.active_connections:
            return

        message = {
            "type": message_type,
            "data": payload,
            "timestamp": asyncio.get_event_loop().time()
        }
        json_data = json.dumps(message)
        
        dead_connections = []
        for connection in self.active_connections:
            try:
                await connection.send_text(json_data)
            except Exception:
                dead_connections.append(connection)

        for dead in dead_connections:
            self.disconnect(dead)

# Global singleton
ws_manager = WebSocketManager()
