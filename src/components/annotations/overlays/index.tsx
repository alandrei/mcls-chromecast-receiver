import React from "react";
import PropTypes from "prop-types";
import { observer } from "mobx-react";
import _pick from "lodash/pick";
import _set from "lodash/set";
import Overlay, { OverlayData } from "./Overlay";

import { parseVariables, parseTimers } from "../../../utils/annotations";

export const OverlayPropTypes = PropTypes.shape({
  key: PropTypes.string.isRequired,
  offset: PropTypes.number.isRequired,
  type: PropTypes.string.isRequired,
  data: PropTypes.shape({
    custom_id: PropTypes.string,
    animatein_duration: PropTypes.number,
    animatein_type: PropTypes.string,
    animateout_duration: PropTypes.number,
    animateout_type: PropTypes.string,
    duration: PropTypes.number,
    position: PropTypes.shape({
      bottom: PropTypes.number,
      hcenter: PropTypes.number,
      left: PropTypes.number,
      right: PropTypes.number,
      top: PropTypes.number,
      vcenter: PropTypes.number,
    }),
    size: PropTypes.shape({
      height: PropTypes.number,
      width: PropTypes.number,
    }),
    svg_url: PropTypes.string,
  }).isRequired,
}).isRequired;

export const VariablePropTypes = PropTypes.shape({
  id: PropTypes.string.isRequired,
  offset: PropTypes.number.isRequired,
  type: PropTypes.oneOf(["set_variable", "increment_variable"]).isRequired,
  data: PropTypes.shape({
    name: PropTypes.string.isRequired,
    type: PropTypes.oneOf(["double", "long", "string"]).isRequired,
    value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    double_precision: PropTypes.number,
    amount: PropTypes.number,
  }).isRequired,
}).isRequired;

export const TimerPropTypes = PropTypes.shape({
  id: PropTypes.string.isRequired,
  offset: PropTypes.number.isRequired,
  type: PropTypes.oneOf([
    "create_timer",
    "start_timer",
    "pause_timer",
    "adjust_timer",
    "skip_timer",
  ]).isRequired,
  data: PropTypes.shape({
    name: PropTypes.string.isRequired,
    format: PropTypes.oneOf(["ms", "s"]).isRequired,
    direction: PropTypes.oneOf(["up", "down"]).isRequired,
    start_value: PropTypes.number.isRequired,
    step: PropTypes.number,
    cap_value: PropTypes.number,
    value: PropTypes.number,
  }).isRequired,
}).isRequired;

export const PreloadedSVGPropTypes = PropTypes.any;

export const OverlaysPropTypes = {
  overlays: PropTypes.arrayOf(OverlayPropTypes),
  variables: PropTypes.arrayOf(VariablePropTypes),
  timers: PropTypes.arrayOf(TimerPropTypes),
  preloadedSVGs: PropTypes.arrayOf(PropTypes.any),
  currentTime: PropTypes.number.isRequired,
  totalTime: PropTypes.number.isRequired,
  playerWidth: PropTypes.number.isRequired,
  playerHeight: PropTypes.number.isRequired,
};

type OverlaysProps = PropTypes.InferProps<typeof OverlaysPropTypes>;
interface OverlaysMap {
  [key: string]: OverlayData;
}

const OVERLAY_DISPOSE_TIMEOUT = 2;
/*
    In order for the react-spring transition to animate (in or out) the Overlay element needs to be alive.
    When seeking, this acts like a delta that allows the overlays to animate. If seeking in between the time
    an animation should start and OVERLAY_DISPOSE_TIMEOUT seconds before, the animation will happen otherwise
    just display the overlay wihtout any animation.
    This should be big enough to allow overlays to finish rendering animations;
 */

function Overlays(props: OverlaysProps) {
  const {
    currentTime,
    totalTime,
    playerWidth,
    playerHeight,
    overlays,
    preloadedSVGs,
    variables,
    timers,
  } = props;
  const overlaysMap: OverlaysMap = {};

  if (!totalTime && overlays?.length === 0) return null;

  overlays?.map((overlay) => {
    if (!overlay) return;

    const overlayID: string = overlay?.data?.custom_id || overlay.key || "";

    if (overlay?.offset && overlay.offset > currentTime) {
      // Current video time is before the overlay should appear
      return;
    }

    if (
      overlay.data?.duration &&
      overlay.offset +
        (overlay.data?.duration / 1000 || 0) +
        OVERLAY_DISPOSE_TIMEOUT <
        currentTime
    ) {
      // Current video time is after the visible period of an overlay with duration
      return;
    }

    if (
      overlay.type === "hide" &&
      (overlaysMap[overlayID]?.animations?.hide?.animateout_duration || 0) +
        overlay.offset +
        OVERLAY_DISPOSE_TIMEOUT <
        currentTime
    ) {
      // Current video time is after hide overlay annotation time
      delete overlaysMap[overlayID];
      return;
    }

    if (overlay.type === "show") {
      overlaysMap[overlayID] = _pick(overlay.data, [
        "custom_id",
        "svg_url",
        "position",
        "size",
        "variable_positions",
      ]);

      if (overlay.offset <= currentTime) {
        _set(
          overlaysMap[overlayID],
          "animations.show",
          _pick(overlay.data, ["animatein_type", "animatein_duration"])
        );
      }

      if (
        overlay.offset + OVERLAY_DISPOSE_TIMEOUT <= currentTime &&
        overlaysMap[overlayID].animations?.show?.animatein_duration
      ) {
        // If seeking OVERLAY_DISPOSE_TIMEOUT seconds after show animation don't animate in
        delete overlaysMap[overlayID].animations?.show?.animatein_duration;
      }

      if (
        overlay.data.duration &&
        overlay.offset + overlay.data.duration / 1000 <= currentTime
      ) {
        _set(
          overlaysMap[overlayID],
          "animations.hide",
          _pick(overlay.data, ["animateout_type", "animateout_duration"])
        );
      }
    }

    // Overlay hide annotation
    if (overlay.type === "hide") {
      if (overlay?.offset <= currentTime) {
        _set(
          overlaysMap[overlayID],
          "animations.hide",
          _pick(overlay.data, ["animateout_type", "animateout_duration"])
        );
      }
    }
  });

  const variablesMap = parseVariables(variables, currentTime);
  const timersMap = parseTimers(timers, currentTime);

  timersMap.forEach((value, key) => {
    variablesMap.set(key, value);
  });

  return (
    <div style={containerStyles} data-testid="overlays-wrapper">
      {Object.keys(overlaysMap).map((key: any) => (
        <Overlay
          key={key}
          data={overlaysMap[key]}
          svg={preloadedSVGs?.[key]}
          stageWidth={playerWidth}
          stageHeight={playerHeight}
          variables={variablesMap}
        />
      ))}
    </div>
  );
}

export default observer(Overlays);

const containerStyles = {
  height: "100%",
  position: "absolute" as const,
  left: 0,
  top: 0,
  overflow: "hidden",
  width: "100%",
  zIndex: 1,
};
