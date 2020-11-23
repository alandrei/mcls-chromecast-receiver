import React from "react";
import ReactDOM from "react-dom";
import { observer } from "mobx-react";

import Marker from "./Marker";

interface MarkerItem {
  key: string;
  label: string;
  offset: number;
  seekOffset?: number;
  time: number;
  color: string;
}

const groupCloseMarkers = (timelineWidth: number, videoDuration: number) => (
  previousValue: { [key: number]: MarkerItem[] },
  currentValue: object
): { [key: number]: MarkerItem[] } => {
  const val = currentValue as MarkerItem;
  const position = (+val?.offset / (videoDuration * 1000) || 0) * 100; // offset is in miliseconds
  const markerPixelMargin = 44;
  const currentPositionPx = (position * timelineWidth) / 100;
  const groupPosition =
    Math.round(currentPositionPx / markerPixelMargin) * markerPixelMargin;

  if (previousValue[groupPosition]) {
    previousValue[groupPosition].push(val);
  } else {
    previousValue[groupPosition] = [val];
  }

  return previousValue;
};

const mergeGroupedMarkers = (
  accumulator: MarkerItem,
  currentValue: MarkerItem,
  _index: number
): MarkerItem => {
  accumulator.key = currentValue.key;
  accumulator.color =
    accumulator.color === currentValue.color || !accumulator.color
      ? currentValue.color
      : "";
  accumulator.offset =
    accumulator.offset && accumulator.offset < currentValue.offset
      ? accumulator.offset
      : currentValue.offset;
  accumulator.seekOffset =
    accumulator.offset && accumulator.offset < currentValue.offset
      ? accumulator.seekOffset
      : currentValue.seekOffset;
  accumulator.time =
    accumulator.time < currentValue.time ? accumulator.time : currentValue.time;

  return accumulator;
};

const Markers = (props: { markers: object[]; videoDuration: number }) => {
  const progressBar = document
    .querySelectorAll("cast-media-player")[0]
    ?.shadowRoot?.getElementById("castControlsProgress");

  if (!progressBar) return null;

  const timelineWidth = progressBar?.clientWidth || 0;

  if (!props.videoDuration) return null;

  progressBar.style.overflow = "visible";

  const groupMarkersReducer = groupCloseMarkers(
    timelineWidth,
    props.videoDuration
  );

  const groupedMarkers = props.markers.reduce<{ [key: number]: MarkerItem[] }>(
    groupMarkersReducer,
    {}
  );
  const newMarkers: MarkerItem[] = Object.keys(
    groupedMarkers
  ).map((group: string) =>
    groupedMarkers[+group].reduce(mergeGroupedMarkers, {} as MarkerItem)
  );

  return ReactDOM.createPortal(
    <div style={containerStyles}>
      {newMarkers.map((item) => {
        const position =
          (item.offset / (props.videoDuration * 1000) || 0) * 100; // offset is in miliseconds

        return (
          position && (
            <Marker
              key={item.key}
              position={position}
              time={item.time}
              color={item.color}
            />
          )
        );
      })}
    </div>,
    progressBar
  );
};

export default observer(Markers);

const containerStyles = {
  height: "8px",
  position: "absolute" as const,
  left: 0,
  top: "50%",
  width: "100%",
  transform: "translate(0, -50%)",
  zIndex: 1,
};
