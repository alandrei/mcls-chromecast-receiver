import React, { Fragment, useRef, useEffect, useState } from "react";
import { observer } from "mobx-react";
import { ContentProtection } from "chromecast-caf-receiver/cast.framework";
import {
  LiveSeekableRange,
  LoadRequestData,
} from "chromecast-caf-receiver/cast.framework.messages";
import { AnnotationsStore } from "@mycujoo/player-mls";
import EventStore from "../stores/EventStore";
import Annotations from "../components/annotations";
import TotalViewers from "../components/TotalViewers";

const context = cast.framework.CastReceiverContext.getInstance();
const playerManager = context.getPlayerManager();
const playbackConfig = new cast.framework.PlaybackConfig();

interface LiveSeekableRangeComplete extends LiveSeekableRange {
  start?: number;
  end?: number;
}

type customDataType = {
  licenseUrl: string;
  protectionSystem: string;
  publicKey: string;
  eventId: string;
  pseudoUserId: string;
};

// Update playback config licenseUrl according to provided value in load request.
playerManager.setMediaPlaybackInfoHandler((loadRequest, playbackConfig) => {
  if (loadRequest.media.customData && loadRequest.media.customData.licenseUrl) {
    playbackConfig.licenseUrl = loadRequest.media.customData.licenseUrl;
  }
  return playbackConfig;
});

playerManager.setSupportedMediaCommands(
  cast.framework.messages.Command.ALL_BASIC_MEDIA
);

function App() {
  const [annotationsLoaded, setAnnotationsLoaded] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const eventStoreRef = useRef(new EventStore());
  const { current: eventStore } = eventStoreRef;

  const annotationsStoreRef = useRef(new AnnotationsStore());
  const { current: annotationsStore } = annotationsStoreRef;

  useEffect(() => {
    const loadRequestCb = (
      request: LoadRequestData
    ): Promise<LoadRequestData> => {
      const customData = request.media.customData as customDataType;

      eventStore.publicKey = customData.publicKey;
      eventStore.eventId = customData.eventId;
      eventStore.pseudoUserId = customData.pseudoUserId;

      if (
        ["widevine", "playready"].includes(customData.protectionSystem) &&
        customData.licenseUrl
      ) {
        // Customize the license url for playback
        playbackConfig.licenseUrl = customData.licenseUrl;
        playbackConfig.protectionSystem = customData.protectionSystem as ContentProtection;
        playbackConfig.licenseRequestHandler = (requestInfo) => {
          requestInfo.withCredentials = true;
        };
      }

      return new Promise((resolve, reject) => {
        try {
          eventStore?.fetchEventById({}).finally(() => {
            eventStore?.fetchTimeline((actions: any, updateId: string) => {
              annotationsStore.actions = actions;
              eventStore.timelineUpdateId = updateId;
              setAnnotationsLoaded(true);
              // switch sourceUrl with the one received from API and don't play the one received with the request, for secure links to work on IPV6
              request.media.contentId = eventStore.sourceUrl;
              resolve(request);
            });
          });
        } catch (error) {
          console.log("ERROR", error);
          reject(request);
        }
      });
    };
    playerManager.setMessageInterceptor(
      cast.framework.messages.MessageType.LOAD,
      loadRequestCb
    );

    context.start({ playbackConfig: playbackConfig });

    return () => {
      context.stop();
    };
  }, []);

  useEffect(() => {
    const timeUpdateCb = (event: any): void => {
      currentTime !== playerManager.getCurrentTimeSec() &&
        setCurrentTime(Math.floor(playerManager.getCurrentTimeSec()));

      if (playerManager.getDurationSec() === -1) {
        const liveRange: LiveSeekableRangeComplete = playerManager.getLiveSeekableRange();
        const duration =
          (liveRange?.end || event.currentMediaTime) - (liveRange?.start || 0);

        setDuration(Math.floor(duration));
      } else {
        duration !== playerManager.getDurationSec() &&
          setDuration(playerManager.getDurationSec());
      }
    };

    playerManager.addEventListener(
      cast.framework.events.EventType.TIME_UPDATE,
      timeUpdateCb
    );

    return () => {
      playerManager.removeEventListener(
        cast.framework.events.EventType.TIME_UPDATE,
        timeUpdateCb
      );
    };
  }, [playerManager, setDuration]);

  useEffect(() => {
    if (duration && annotationsStore.overlays.length)
      annotationsStore.preloadOverlaySVGs();
  }, [duration, annotationsStore.overlays]);

  const isLive = playerManager?.getLiveSeekableRange()?.isLiveDone === false;

  return (
    <Fragment>
      <div
        id="castContainer"
        dangerouslySetInnerHTML={{
          __html: "<cast-media-player></cast-media-player>",
        }}
      ></div>
      {annotationsLoaded && (
        <Annotations
          markers={annotationsStore.markers}
          overlays={annotationsStore.overlays}
          variables={annotationsStore.variables}
          timers={annotationsStore.timers}
          duration={duration}
          currentTime={currentTime}
          preloadedSVGs={annotationsStore.preloadedSVGs}
        />
      )}
      {eventStore.eventId && (
        <TotalViewers
          eventStore={eventStore}
          isLive={isLive}
          annotationsStore={annotationsStore}
        />
      )}
    </Fragment>
  );
}

export default observer(App);
