const API_ENDPOINT = "https://mls-api.mycujoo.tv/";
const EVENTS_PATH = "bff/events/v1beta1/";
const TIMELINE_PATH = "bff/timeline/v1beta1/";

export function eventAPIEndpoint(eventId: string) {
  return `${API_ENDPOINT}${EVENTS_PATH}${eventId}`;
}

export function timelineAPIEndpoint(timelineId: string) {
  return `${API_ENDPOINT}${TIMELINE_PATH}${timelineId}`;
}

export const language = window?.navigator?.language || "en";

export function getSVGRatio(svgText: string) {
  const regex = /<svg.*viewBox="([0-9 ]+)".*>/gm;
  const m = regex.exec(svgText);

  const viewbox = m?.[1].split(" ");
  const width = viewbox?.[2] || 0;
  const height = viewbox?.[3] || 0;

  if (!m) return 0;

  if (m && m.index === regex.lastIndex) {
    regex.lastIndex++;
  }

  return +height ? +width / +height : 0;
}

export const formatNumber = (n: number) => {
  if (n < 1e3) return n;
  if (n >= 1e3 && n < 1e6) return +(n / 1e3).toFixed(1) + "K";
  if (n >= 1e6 && n < 1e9) return +(n / 1e6).toFixed(1) + "M";
  if (n >= 1e9 && n < 1e12) return +(n / 1e9).toFixed(1) + "B";
  if (n >= 1e12) return +(n / 1e12).toFixed(1) + "T";
};
