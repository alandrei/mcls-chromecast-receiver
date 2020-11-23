const formatTimer = (seconds: number = 0, format: "ms" | "s" = "s") => {
  seconds = seconds < 0 ? 0 : seconds;
  const s = Math.floor(seconds % 60);
  const m = Math.floor(seconds / 60);

  if (isNaN(seconds) || seconds === Infinity) {
    return "0";
  }

  if (format === "ms") {
    return (
      ((m > 9 && `${m}:`) || (m > 0 && `0${m}:`) || "00:") +
      (s > 9 ? s : `0${s}`)
    );
  } else {
    return m * 60 + s + "";
  }
};

interface VariableData {
  name: string;
  type: string;
  value: string | number;
  double_precision?: number | null;
  amount?: number | null;
}

export interface VariableAction {
  id: string;
  offset: number;
  type: string;
  data: VariableData | null | undefined;
}

export function parseVariables(
  actions: VariableAction[] | null | undefined,
  time: number
) {
  const variables = new Map();

  try {
    actions?.map((action) => {
      if (action.offset / 1000 > time || !action?.data) return null;

      if (action.type === "set_variable") {
        variables.set(action.data.name, {
          value: action.data.value,
          precision: action.data?.double_precision || 0,
        });
      }

      if (action.type === "increment_variable") {
        const currentVariable = variables.get(action.data.name);

        currentVariable.value =
          currentVariable.value + (action.data.amount || 0);

        variables.set(action.data.name, currentVariable);
      }

      return null;
    });

    variables.forEach((variable, key) => {
      const precision = variable.precision && Math.pow(10, variable.precision);

      const formattedValue = precision
        ? (Math.round(variable.value * precision) / precision).toFixed(
            variable.precision || 0
          )
        : variable.value + "";
      variables.set(key, formattedValue);
    });
  } catch (e) {
    // tslint:disable-next-line: no-console
    console.error("Failed to parse variables", e);
  }

  return variables;
}

interface TimerData {
  name: string;
  format: string;
  direction: string;
  start_value: number;
  step?: number | null;
  cap_value?: number | null;
  value?: number | null;
}

export interface TimerAction {
  id: string;
  offset: number;
  type: string;
  data: TimerData;
}

export function parseTimers(
  actions: TimerAction[] | null | undefined,
  time: number
) {
  const timers = new Map();

  try {
    actions?.forEach((action) => {
      if (action.offset / 1000 > time) return null;

      const timer = timers.get(action.data.name);

      if (!timer) return;

      switch (action.type) {
        case "create_timer":
          const timerDetails = {
            isStarted: false,
            currentIntervalTime: 0,
            total: action.data.start_value,
            format: action.data.format,
            step: action.data.step || 1000,
            direction: action.data.direction || "up",
            cap: action.data.cap_value,
          };
          timers.set(action.data.name, timerDetails);
          break;
        case "start_timer":
          timer.isStarted = true;
          timer.currentIntervalTime = time * 1000 - action.offset;
          timers.set(action.data.name, timer);
          break;
        case "pause_timer":
          if (timer.isStarted === false) break; // ignore pause actions while paused
          timer.isStarted = false;
          timer.total =
            timer.total +
            (timer.currentIntervalTime - (time * 1000 - action.offset)) *
              (timer.direction === "up" ? 1 : -1);

          timer.currentIntervalTime = 0;
          timers.set(action.data.name, timer);
          break;
        case "adjust_timer":
          timer.total = action.data.value || 0;

          if (timer.isStarted) {
            timer.currentIntervalTime = time * 1000 - action.offset;
          } else {
            timer.currentIntervalTime = 0;
          }

          timers.set(action.data.name, timer);

          break;
        case "skip_timer":
          timer.total = timer.total + (action?.data?.value || 0);
          timers.set(action.data.name, timer);
          break;
      }
    });

    timers.forEach((value, key) => {
      let timerTotalTime =
        (value.total +
          value.currentIntervalTime * (value.direction === "up" ? 1 : -1)) /
        1000;
      if (value.cap !== undefined) {
        timerTotalTime =
          value.direction === "up"
            ? Math.min(timerTotalTime, value?.cap || Infinity)
            : Math.max(timerTotalTime, value?.cap || -Infinity);
      }
      if (value.step && timerTotalTime % (value.step / 1000) !== 0) {
        timerTotalTime =
          timerTotalTime - (timerTotalTime % (value.step / 1000));
      }

      timers.set(key, formatTimer(timerTotalTime, value?.format));
    });
  } catch (e) {
    // tslint:disable-next-line: no-console
    console.error("Failed to parse timer", e);
  }

  return timers;
}

const actionPriorities: { [key: string]: number } = {
  set_variable: 1000,
  create_timer: 1000,
  increment_variable: 500,
  start_timer: 500,
  pause_timer: 400,
  adjust_timer: 300,
  skip_timer: 200,
  show_overlay: 100,
  hide_overlay: 50,
};

export function sortActionsByPriorities(
  a: { offset: number; type: string },
  b: { offset: number; type: string }
): number {
  if (
    a.offset === b.offset &&
    actionPriorities[a.type] < actionPriorities[b.type]
  ) {
    return 1;
  } else if (actionPriorities[a.type] > actionPriorities[b.type]) {
    return -1;
  }

  return 0;
}
