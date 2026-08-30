from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from ..services.websocket_manager import ws_manager

router = APIRouter(tags=["WebSockets"])

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """Real-time bi-directional WebSocket connection for alerts and live dashboard data."""
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep connection alive and accept incoming heartbeat / messages
            data = await websocket.receive_text()
            # Echo ping-pong or handle client signals if needed
            if data == "ping":
                await websocket.send_text('{"type": "pong"}')
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)
