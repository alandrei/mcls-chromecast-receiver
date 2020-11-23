import React from "react";
import ReactDOM from "react-dom";
import { useRealtimeEventUpdates } from "../stores/Realtime";
import { formatNumber } from "../utils";

function TotalViewers({
  eventStore,
  isLive,
  annotationsStore,
}: {
  eventStore: any;
  isLive: boolean;
  annotationsStore: any;
}) {
  const { totalViewers } = useRealtimeEventUpdates({
    sessionId: eventStore.pseudoUserId,
    eventId: eventStore.eventId,
    timelineId: eventStore.timelineId,
    updateEvent: async (updateId: string) => {
      await eventStore?.fetchEventById({
        eventId: eventStore.eventId,
        cacheKey: updateId,
      });
      eventStore.eventUpdateId = updateId;
    },
    updateTimeline: (updateId: string) => {
      eventStore?.fetchTimeline((actions: any, updateId: string) => {
        annotationsStore.actions = actions;
        eventStore.timelineUpdateId = updateId;
      }, updateId);
    },
  });

  const formatedTotalViewers = formatNumber(totalViewers);
  const liveIndicator = document
    .querySelectorAll("cast-media-player")[0]
    ?.shadowRoot?.querySelector(".videoLiveIndicator") as HTMLElement;
  const liveIndicatorLabel = liveIndicator.querySelector(
    ".liveLabel"
  ) as HTMLElement;

  if (liveIndicator?.style) {
    liveIndicator.style.display = isLive ? "flex" : "none";
    liveIndicator.style.marginTop = "-3px";
  }

  if (liveIndicatorLabel?.style) {
    liveIndicatorLabel.style.marginRight = "16px";
    liveIndicatorLabel.style.backgroundColor = "red";
    liveIndicatorLabel.style.color = "white";
    liveIndicatorLabel.style.padding = "2px 6px";
    liveIndicatorLabel.style.borderRadius = "2px";
  }

  return isLive && liveIndicator && totalViewers > 1
    ? ReactDOM.createPortal(
        <div style={totalViewersBoxStyle}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            style={eyeIconStyle}
          >
            <path
              d="M14 12c0 1.103-.897 2-2 2s-2-.897-2-2 .897-2 2-2 2 .897 2 2zm10-.449s-4.252 7.449-11.985 7.449c-7.18 0-12.015-7.449-12.015-7.449s4.446-6.551 12.015-6.551c7.694 0 11.985 6.551 11.985 6.551zm-8 .449c0-2.208-1.791-4-4-4-2.208 0-4 1.792-4 4 0 2.209 1.792 4 4 4 2.209 0 4-1.791 4-4z"
              fill="#FFF"
            />
          </svg>
          {formatedTotalViewers}
        </div>,
        liveIndicator
      )
    : null;
}

export default TotalViewers;

const totalViewersBoxStyle = {
  color: "#FFF",
  fontSize: "1.2em",
  fontWeight: "bold" as const,
  padding: "1px 8px 1px 4px",
  backgroundColor: "rgba(0,0,0,0.2)",
  borderRadius: "2px",
  display: "flex",
  alignItems: "center",
};

const eyeIconStyle = {
  height: "16px",
  marginRight: "4px",
};
