"""Polite Background Polling & Ingestion Scheduler for USNIC Iceberg & Bremen Sea-Ice Datasets.

Executes:
- 6-hour polite check of USNIC source for new weekly observation releases.
- Ingestion, database persistence, and 72-hour forecast recalculation upon detected source change.
- Real-time event broadcasting to connected frontend clients via WebSocket.
"""

import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional

from ..database.connection import SessionLocal
from .usnic_service import ingest_usnic_dataset, load_current_icebergs
from .sea_ice_pipeline import aggregate_and_ingest_sea_ice_data
from .websocket_manager import ws_manager

logger = logging.getLogger(__name__)

# Polling interval: 6 hours (in seconds)
POLL_INTERVAL_SECONDS = 6 * 3600

_scheduler_task: Optional[asyncio.Task] = None
_is_running = False


async def run_periodic_iceberg_sync():
    """Continuous background loop checking USNIC dataset every 6 hours."""
    global _is_running
    _is_running = True
    logger.info("[*] USNIC Iceberg & Sea-Ice Background Sync Scheduler started (6-hour polite interval).")

    while _is_running:
        try:
            logger.info("[*] Checking USNIC for new weekly observation dataset...")
            db = SessionLocal()
            try:
                # 1. Ingest USNIC with polite change detection
                res = ingest_usnic_dataset(db, force=False)
                
                # If new observations were ingested or source changed, notify frontend via WebSocket
                if res.get("status") == "SUCCESS" or res.get("new_observations_stored", 0) > 0:
                    current_bergs = load_current_icebergs(db)
                    await ws_manager.broadcast(
                        "ICEBERGS_UPDATED",
                        {
                            "source": "U.S. National Ice Center (USNIC)",
                            "observation_type": "Latest Available Weekly Observation",
                            "total_icebergs": len(current_bergs),
                            "timestamp": datetime.now(timezone.utc).isoformat(),
                        },
                    )
            finally:
                db.close()

        except Exception as err:
            logger.error(f"[!] Background sync cycle encountered error: {err}")

        # Wait 6 hours before next polite check
        await asyncio.sleep(POLL_INTERVAL_SECONDS)


def start_iceberg_scheduler():
    """Start the asynchronous background scheduler task."""
    global _scheduler_task
    if _scheduler_task is None or _scheduler_task.done():
        loop = asyncio.get_event_loop()
        _scheduler_task = loop.create_task(run_periodic_iceberg_sync())
        logger.info("[+] USNIC background sync task scheduled successfully.")


def stop_iceberg_scheduler():
    """Cancel the background scheduler task."""
    global _is_running, _scheduler_task
    _is_running = False
    if _scheduler_task and not _scheduler_task.done():
        _scheduler_task.cancel()
        logger.info("[-] USNIC background sync task cancelled.")
