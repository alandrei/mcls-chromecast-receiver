import React, { memo } from "react";
import PropTypes from "prop-types";

export const MarkerPropTypes = PropTypes.shape({
  key: PropTypes.string,
  label: PropTypes.string,
  offset: PropTypes.string,
  seekOffset: PropTypes.number,
  time: PropTypes.string,
  color: PropTypes.string,
}).isRequired;

export interface MProps {
  key: string;
  position: number;
  time: number;
  color?: string;
}

const Marker = (props: MProps) => {
  return (
    <div
      data-testid="marker-wrapper"
      style={{ ...rootStyle, left: `${props.position}%` }}
    >
      <div style={markerStyle(props.color)} data-testid="marker-segment" />
    </div>
  );
};

export default memo(Marker);

const rootStyle = {
  height: "100%",
  maxWidth: "3px",
  position: "absolute" as const,
  width: "4px",
  transform: "translateX(-50%)",
  zIndex: 2,
};

const markerStyle = (color: string | undefined) => ({
  backgroundColor: color || "hsla(0,0%,100%,.5)",
  height: "100%",
  width: "100%",
});
