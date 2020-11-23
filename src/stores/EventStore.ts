import { observable, action, computed } from "mobx";
import axios from "axios";

const API_ENDPOINT = "https://mls-api.mycujoo.tv/";
const EVENTS_PATH = "bff/events/v1beta1/";
const TIMELINE_PATH = "bff/timeline/v1beta1/";
const language = window?.navigator?.language || "en";

export class EventStore {
  publicKey = "";

  @observable
  pseudoUserId = "";

  @observable
  eventId = "";

  @observable
  eventUpdateId = "";

  @observable
  streamId = "";

  @observable
  timelineId = "";

  @observable
  timelineUpdateId = "";

  @observable
  sourceUrl = "";

  @observable
  googimaTag = "";

  @observable
  title = "";

  @observable
  isLoading = true;

  @observable
  notFound = false;

  @observable
  hadError = false;

  pollingTimeoutRef: any = 0;

  @observable
  playerConfig: {
    primaryColor: string;
    secondaryColor: string;
    autoplay: boolean;
    defaultVolume: number;
    backForwardButtons: boolean;
    liveViewers: boolean;
    eventInfoButton: boolean;
  } | null = null;

  @observable
  description = "";

  @observable
  date = new Date();

  @computed
  get formattedDate(): string {
    return (
      this.date.toLocaleDateString(language) +
      " - " +
      this.date.toLocaleTimeString(language, {
        hour: "2-digit",
        minute: "2-digit",
      }) +
      " (" +
      Intl.DateTimeFormat().resolvedOptions().timeZone +
      ")"
    );
  }

  @action.bound
  async fetchEventById({
    eventId = this.eventId,
    cacheKey = this.eventUpdateId,
  }: {
    eventId?: string;
    cacheKey?: string;
  }): Promise<void> {
    this.isLoading = true;
    this.notFound = false;
    this.hadError = false;
    this.eventId = eventId;

    try {
      const response = await axios.get(
        API_ENDPOINT +
          EVENTS_PATH +
          eventId +
          (cacheKey ? `?update_id=${cacheKey}` : ""),
        {
          headers: {
            authorization: `Bearer ${this.publicKey}`,
          },
        }
      );
      const firstStream =
        response?.data?.streams?.length && response.data.streams.shift();

      this.sourceUrl = this.sourceUrl || firstStream?.full_url; // if the stream gets updated with a new full_url, do not reload the player but leave the current stream url playing.

      if (!this.sourceUrl) {
        this.pollingTimeoutRef && clearTimeout(this.pollingTimeoutRef);
        this.startPollingWhenNoSourceUrl(eventId, cacheKey);
      }

      this.streamId = firstStream?.id;
      this.timelineId =
        response?.data?.timeline_ids?.length &&
        response.data.timeline_ids.shift();
      this.title = response?.data?.title;
      this.description = response?.data?.description;
      this.date =
        response?.data?.start_time && new Date(response.data.start_time);
      this.isLoading = false;
    } catch (error) {
      console.error(`Failed to fetch event with id ${eventId}`, error);

      if (error?.response?.status === 404) {
        this.notFound = true;
      } else {
        this.notFound = true;
        this.hadError = true;
      }

      this.isLoading = false;
    }
  }

  @action.bound // temporary polling every 30s mechanism until the socket event start update will be triggered
  startPollingWhenNoSourceUrl(eventId: string, cacheKey?: string): void {
    this.pollingTimeoutRef = setTimeout(() => {
      console.log("FETCHING NEW DATA ...");
      this.fetchEventById({ eventId, cacheKey });
    }, 30000);
  }

  timeoutId = 0;

  @action.bound
  async fetchTimeline(cb: any, updateId = ""): Promise<void> {
    if (!this.timelineId) {
      return;
    }

    try {
      const {
        // eslint-disable-next-line @typescript-eslint/camelcase
        data: { actions, update_id, errors },
      } = await axios.get(
        API_ENDPOINT +
          TIMELINE_PATH +
          this.timelineId +
          (updateId ? `?update_id=${updateId}` : ""),
        {
          headers: {
            authorization: `Bearer ${this.publicKey}`,
          },
        }
      );

      if (actions) {
        if (
          errors &&
          errors.length &&
          errors.find((e: { message: string[] }) => e.message.includes("404"))
        ) {
          this.timeoutId = window.setTimeout(async () => {
            await this.fetchTimeline(cb);
          }, 10000);

          throw new Error(
            "Error while loading annotations. Retrying in 10s..."
          );
        }

        cb(actions, update_id);
      } else {
        this.timeoutId = window.setTimeout(async () => {
          await this.fetchTimeline(cb);
        }, 1000);

        throw new Error("Server error. Retrying in 1s...");
      }
    } catch (e) {
      console.log("Failed to fetch annotations", e);
    }
  }
}

export default EventStore;
