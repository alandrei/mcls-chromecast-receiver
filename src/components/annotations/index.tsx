import React, { Fragment, useEffect, useState } from "react";
import PropTypes from "prop-types";
import { observer } from "mobx-react";
import Markers from "../annotations/markers";
import Overlays, {
  OverlayPropTypes,
  VariablePropTypes,
  TimerPropTypes,
  PreloadedSVGPropTypes,
} from "../annotations/overlays";

const AnnotationsPropTypes = {
  markers: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string,
      label: PropTypes.string,
      offset: PropTypes.string,
      seekOffset: PropTypes.number,
      time: PropTypes.string,
      color: PropTypes.string,
    }).isRequired
  ).isRequired,
  overlays: PropTypes.arrayOf(OverlayPropTypes),
  variables: PropTypes.arrayOf(VariablePropTypes),
  timers: PropTypes.arrayOf(TimerPropTypes),
  duration: PropTypes.number,
  currentTime: PropTypes.number,
  preloadedSVGs: PropTypes.arrayOf(PreloadedSVGPropTypes),
};
type AnnotationsProps = PropTypes.InferProps<typeof AnnotationsPropTypes>;

const Annotations = ({
  markers,
  overlays,
  variables,
  timers,
  duration,
  currentTime,
  preloadedSVGs,
}: AnnotationsProps) => {
  const [shadowDomRendered, setShadowDomRendered] = useState(false);
  const [foregroundVisible, setForegroundVisible] = useState(false);
  const shadowRoot = document.querySelectorAll("cast-media-player")[0]
    ?.shadowRoot;
  useEffect(() => {
    setShadowDomRendered(
      !!document
        .querySelectorAll("cast-media-player")[0]
        ?.shadowRoot?.querySelector(".foreground")
    );
  }, [shadowRoot]);

  const foreground = document
    .querySelectorAll("cast-media-player")[0]
    ?.shadowRoot?.querySelector(".foreground");

  useEffect(() => {
    setForegroundVisible(!!foreground);
  }, [shadowDomRendered, foreground]);

  if (!foreground || !duration || !currentTime) return null;

  return foregroundVisible ? (
    <Fragment>
      {markers && <Markers markers={markers} videoDuration={duration} />}
      {overlays && (
        <Overlays
          overlays={overlays}
          variables={variables}
          timers={timers}
          currentTime={currentTime}
          totalTime={duration}
          playerHeight={foreground.clientHeight}
          playerWidth={foreground.clientWidth}
          preloadedSVGs={preloadedSVGs}
        />
      )}
    </Fragment>
  ) : null;
};

Annotations.propTypes = AnnotationsPropTypes;

export default observer(Annotations);
