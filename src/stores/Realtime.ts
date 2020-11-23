/** @prettier */
import { useEffect, useState } from "react";
import useWebSocket from "react-use-websocket";

const messageSegment = {
  eventUpdateType: 0,
  eventId: 1,
  value: 2,
};

const wsUrl = "wss://mls-rt.mycujoo.tv";

const registerSession = (sessionId = ""): string => `sessionId;${sessionId}`;
const joinEvent = (eventId = ""): string => `joinEvent;${eventId}`;
const joinTimeline = (timelineId = "", updateId = ""): string =>
  `joinTimeline;${timelineId};${updateId}`;

let isSessionRegistered = false;
const joinedEvents: string[] = [];
const joinedTimelines: string[] = [];

export function useRealtimeEventUpdates({
  sessionId,
  eventId,
  timelineId,
  updateEvent,
  updateTimeline,
}: {
  sessionId: string;
  eventId: string;
  timelineId?: string;
  updateEvent?: (eventUpdateId: string) => void;
  updateTimeline?: (updateId: string) => void;
}): { totalViewers: number } {
  const [totalViewers, setTotalViewers] = useState(0);
  const [eventUpdateId, setEventUpdateId] = useState("");
  const [timelineUpdateId, setTimelineUpdateId] = useState("");

  const { sendMessage, lastMessage } = useWebSocket(wsUrl, {
    share: true,
    retryOnError: true,
  });

  useEffect(() => {
    if (!joinedEvents.includes(eventId)) {
      sendMessage(joinEvent(eventId));
      joinedEvents.push(eventId);
    }
  }, [eventId, sendMessage]);

  useEffect(() => {
    if (timelineId && !joinedTimelines.includes(timelineId)) {
      sendMessage(joinTimeline(timelineId, timelineUpdateId));
      joinedTimelines.push(timelineId);
    }
  }, [timelineId, timelineUpdateId, sendMessage]);

  useEffect(() => {
    !isSessionRegistered && sendMessage(registerSession(sessionId));
    isSessionRegistered = true;
  }, [sendMessage, sessionId]);

  useEffect(() => {
    const newMessage = lastMessage?.data.split(";");

    switch (newMessage?.[messageSegment.eventUpdateType]) {
      case "eventTotal":
        const newTotal = newMessage?.[messageSegment.value];

        newTotal && setTotalViewers(+newTotal);
        break;
      case "eventUpdate":
        const newEventUpdateId = newMessage?.[messageSegment.value];

        if (newEventUpdateId !== eventUpdateId) {
          updateEvent && updateEvent(newEventUpdateId);
          setEventUpdateId(newEventUpdateId);
        }
        break;
      case "timelineUpdate":
        const newTimelineUpdateId = newMessage?.[messageSegment.value];

        if (newTimelineUpdateId !== timelineUpdateId) {
          updateTimeline && updateTimeline(newTimelineUpdateId);
          setTimelineUpdateId(newTimelineUpdateId);
        }
        break;
    }
  }, [
    lastMessage,
    updateEvent,
    updateTimeline,
    eventUpdateId,
    timelineUpdateId,
  ]);

  return { totalViewers };
}
