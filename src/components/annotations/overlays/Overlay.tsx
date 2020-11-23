import React, { useState, useEffect, useMemo, memo, Fragment } from "react";
import { observer } from "mobx-react";
import { useTransition, animated } from "react-spring";
import { getSVGRatio } from "../../../utils";

interface OverlayPosition {
  bottom?: number | null;
  top?: number | null;
  vcenter?: number | null;
  left?: number | null;
  right?: number | null;
  hcenter?: number | null;
}

export interface Animation {
  show?: {
    animatein_type: string;
    animatein_duration?: number;
  };
  hide?: {
    animateout_type: string;
    animateout_duration?: number;
  };
}
export interface OverlayData {
  custom_id?: string | null;
  animations?: Animation;
  position?: OverlayPosition | null;
  size?: { height?: number | null; width?: number | null } | null;
  variable_positions?: string[];
  svg_url?: string | null;
}

export interface OverlayProps {
  data: OverlayData;
  svg: string;
  stageWidth: number;
  stageHeight: number;
  variables: Map<string, string | number>;
}

function Overlay({
  data,
  svg,
  stageHeight,
  stageWidth,
  variables,
}: OverlayProps) {
  const [visible, setVisible] = useState(true);
  const { position, animations, size } = data;
  const variablePosition = data.variable_positions;
  let parsedSVG = svg || "";

  if (variablePosition) {
    variablePosition.forEach((variableName: string) => {
      parsedSVG = parsedSVG.replace(
        variableName,
        String(variables.get(variableName))
      );
    });
  }

  const animateInDuration = animations?.show?.animatein_duration || 0;
  const animateOutDuration = animations?.hide?.animateout_duration || 0;

  const svgRatio = getSVGRatio(svg) || 1;

  // calculate svg size based on ratio
  const overlayWidth =
    ((size?.width || 0) * stageWidth) / 100 ||
    (((size?.height || 0) * stageHeight) / 100) * svgRatio;
  const overlayHeight =
    ((size?.height || 0) * stageHeight) / 100 ||
    ((size?.width || 0) * stageWidth) / 100 / svgRatio;

  const { top, left } = useMemo(
    () =>
      calculateTopLeftPosition({
        position,
        stageHeight,
        stageWidth,
        overlayWidth,
        overlayHeight,
      }),
    [position, stageHeight, stageWidth, overlayWidth, overlayHeight]
  );

  const componentStyling = useMemo(
    () => parseSvgStyling({ top, left, overlayWidth, overlayHeight, size }),
    [top, left, overlayWidth, overlayHeight, size]
  );

  const animation = useMemo(
    () =>
      getAnimationValues({
        animations,
        animateInDuration,
        animateOutDuration,
        stageHeight,
        stageWidth,
        top,
        left,
      }),
    [
      animations,
      animateInDuration,
      animateOutDuration,
      stageHeight,
      stageWidth,
      top,
      left,
    ]
  );

  const transitions = useTransition(
    visible ? [{ top, left, key: "show" }] : [],
    null,
    animation
  );

  useEffect(() => {
    setVisible(!animations?.hide);
  }, [animations]);

  return (
    <Fragment>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .overlay-wrapper svg {
            height: 100%!important;
            width: 100%!important;
        }`,
        }}
      />
      {transitions.map(({ item, key, props }) => {
        return (
          item && (
            <animated.div
              key={key}
              style={{ ...componentStyling, ...props }}
              data-testid="overlay-wrapper"
            >
              <span
                className="overlay-wrapper"
                style={svgStyle}
                dangerouslySetInnerHTML={{ __html: parsedSVG }}
              />
            </animated.div>
          )
        );
      })}
    </Fragment>
  );
}

export default memo(observer(Overlay));

const parseSvgStyling = ({
  top,
  left,
  overlayWidth,
  overlayHeight,
  size = { height: 0, width: 0 },
}: {
  overlayWidth: number;
  overlayHeight: number;
  left: number;
  top: number;
  size?: {
    height?: number | null;
    width?: number | null;
  } | null;
}) => {
  const height = size?.height || 0;
  const width = size?.width || 0;

  return {
    height: overlayHeight
      ? overlayHeight.toFixed(2) + "px"
      : height
      ? height + "%"
      : "auto",
    maxHeight: height ? height + "%" : "inherit",
    width: overlayWidth
      ? overlayWidth.toFixed(2) + "px"
      : width
      ? width + "%"
      : "auto",
    maxWidth: width ? width + "%" : "inherit",
    zIndex: 1,
    opacity: 1,
    position: "absolute" as const,
    left: left || "0",
    top: top || "0",
  };
};

const svgStyle = {
  height: "100%", // needed because svgs might have inline styling
  width: "100%",
};

const getAnimationValues = ({
  animations,
  left,
  top,
  animateInDuration,
  animateOutDuration,
  stageHeight,
  stageWidth,
}: {
  animations?: Animation;
  left: number;
  top: number;
  animateInDuration: number;
  animateOutDuration: number;
  stageHeight: number;
  stageWidth: number;
}) => {
  const enterState = ({
    // tslint:disable-next-line: no-shadowed-variable
    left = 0,
    // tslint:disable-next-line: no-shadowed-variable
    top = 0,
  }: {
    left: number;
    top: number;
  }) => async (next: any) => {
    await next({ left, top, opacity: 1 });
  };

  const transition: any = {
    from: { left: 0, top: 0, opacity: 0 },
    enter: enterState,
    update: enterState,
    leave: { left, top, opacity: 1 },
    config: { duration: animateInDuration },
  };

  if (animations?.show) {
    switch (animations?.show?.animatein_type) {
      case "fade_in":
        transition.from = { left, top, opacity: 0 };
        break;
      case "slide_from_left":
        transition.from = { top, left: -stageWidth, opacity: 1 };
        break;
      case "slide_from_top":
        transition.from = { left, top: -stageHeight, opacity: 1 };
        break;
      case "slide_from_bottom":
        transition.from = { left, top: stageHeight, opacity: 1 };
        break;
      case "slide_from_right":
        transition.from = { top, left: stageWidth, opacity: 1 };
        break;
      case "none":
      default:
        transition.from = { left, top, opacity: 1 };
    }
  }

  if (animations?.hide) {
    switch (animations?.hide?.animateout_type) {
      case "fade_out":
        transition.leave = { left, top, opacity: 0 };
        break;
      case "slide_to_left":
        transition.leave = { left: -stageWidth, top, opacity: 1 };
        break;
      case "slide_to_top":
        transition.leave = { left, top: -stageHeight, opacity: 1 };
        break;
      case "slide_to_bottom":
        transition.leave = { left, top: stageHeight, opacity: 1 };
        break;
      case "slide_to_right":
        transition.leave = { left: stageWidth, top, opacity: 1 };
        break;
      case "none":
      default:
        transition.leave = { left, top, opacity: 0 };
        transition.config.duration = 0;
    }

    transition.config.duration =
      (animations?.hide?.animateout_type !== "none" && animateOutDuration) || 0;
  }

  return transition;
};

const calculateTopLeftPosition = ({
  position,
  stageHeight,
  stageWidth,
  overlayWidth,
  overlayHeight,
}: any) => {
  let top = 0;
  let left = 0;

  if (!position || !stageHeight || !stageWidth) {
    return { top, left };
  }

  if (position.top) {
    top = (position.top * stageHeight) / 100;
  }
  if (position.bottom) {
    top = stageHeight - (position.bottom * stageHeight) / 100 - overlayHeight;
  }
  if (position.vcenter || position.vcenter === 0) {
    top =
      stageHeight * 0.5 -
      overlayHeight * 0.5 +
      (position.vcenter * stageHeight) / 100;
  }

  if (position.left) {
    left = (position.left * stageWidth) / 100;
  }
  if (position.right) {
    left = stageWidth - (position.right * stageWidth) / 100 - overlayWidth;
  }
  if (position.hcenter || position.hcenter === 0) {
    left =
      stageWidth * 0.5 -
      overlayWidth * 0.5 +
      (position.hcenter * stageWidth) / 100;
  }

  return { top, left };
};
