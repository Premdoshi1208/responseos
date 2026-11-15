import asyncio
from dataclasses import dataclass, field
from typing import Dict, Set
import json
import time


@dataclass
class SSEEvent:
    event_type: str
    data: dict
    workspace_id: str
    id: int = 0
    timestamp: float = field(default_factory=time.time)


class EventManager:
    def __init__(self):
        self._subscribers: Dict[str, Set[asyncio.Queue]] = {}
        self._event_counter = 0
        self._recent_events: Dict[str, list] = {}

    def subscribe(self, workspace_id: str) -> asyncio.Queue:
        if workspace_id not in self._subscribers:
            self._subscribers[workspace_id] = set()
        queue: asyncio.Queue = asyncio.Queue(maxsize=100)
        self._subscribers[workspace_id].add(queue)
        return queue

    def unsubscribe(self, workspace_id: str, queue: asyncio.Queue):
        if workspace_id in self._subscribers:
            self._subscribers[workspace_id].discard(queue)

    async def broadcast(self, workspace_id: str, event_type: str, data: dict):
        self._event_counter += 1
        event = SSEEvent(
            event_type=event_type,
            data=data,
            workspace_id=workspace_id,
            id=self._event_counter,
        )
        if workspace_id not in self._recent_events:
            self._recent_events[workspace_id] = []
        self._recent_events[workspace_id].append(event)
        if len(self._recent_events[workspace_id]) > 100:
            self._recent_events[workspace_id] = self._recent_events[workspace_id][-100:]

        if workspace_id in self._subscribers:
            for queue in self._subscribers[workspace_id].copy():
                try:
                    queue.put_nowait(event)
                except asyncio.QueueFull:
                    pass

    def get_missed_events(self, workspace_id: str, last_event_id: int) -> list:
        events = self._recent_events.get(workspace_id, [])
        return [e for e in events if e.id > last_event_id]


event_manager = EventManager()
