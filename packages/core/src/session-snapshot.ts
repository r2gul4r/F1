import { Driver, SelectionState, SessionSnapshot, SessionSnapshotEvent } from "./contracts.js";

export type SessionSnapshotReducerOptions = {
  maxPredictions?: number;
};

const DEFAULT_MAX_PREDICTIONS = 12;

const cloneDriver = (driver: Driver): Driver => ({ ...driver });

const coerceStateForSession = (
  state: SessionSnapshot,
  sessionId: string | null
): SessionSnapshot => {
  if (sessionId === null || state.sessionId === sessionId) {
    return state;
  }

  return createSessionSnapshot(sessionId);
};

export const createSessionSnapshot = (sessionId: string | null = null): SessionSnapshot => ({
  sessionId,
  drivers: [],
  latestTicksByDriver: {},
  flag: null,
  predictions: []
});

export const reduceSessionSnapshot = (
  state: SessionSnapshot,
  event: SessionSnapshotEvent,
  options: SessionSnapshotReducerOptions = {}
): SessionSnapshot => {
  const maxPredictions = options.maxPredictions ?? DEFAULT_MAX_PREDICTIONS;

  if (event.type === "session.reset") {
    return createSessionSnapshot(event.sessionId);
  }

  if (event.type === "drivers.set") {
    const sessionId = event.drivers[0]?.sessionId ?? state.sessionId;
    const nextState = coerceStateForSession(state, sessionId);
    return {
      ...nextState,
      sessionId,
      drivers: event.drivers.map(cloneDriver)
    };
  }

  if (event.type === "telemetry.upsert") {
    const nextState = coerceStateForSession(state, event.tick.sessionId);
    return {
      ...nextState,
      sessionId: event.tick.sessionId,
      latestTicksByDriver: {
        ...nextState.latestTicksByDriver,
        [event.tick.driverId]: { ...event.tick }
      }
    };
  }

  if (event.type === "flag.set") {
    const nextState = coerceStateForSession(state, event.flag.sessionId);
    return {
      ...nextState,
      sessionId: event.flag.sessionId,
      flag: { ...event.flag }
    };
  }

  const nextState = coerceStateForSession(state, event.prediction.sessionId);
  return {
    ...nextState,
    sessionId: event.prediction.sessionId,
    predictions: [...nextState.predictions, { ...event.prediction }].slice(-maxPredictions)
  };
};

export const initializeSelectionState = (
  snapshot: SessionSnapshot,
  preferredDriverId: string | null = null
): SelectionState => {
  if (preferredDriverId && snapshot.drivers.some((driver) => driver.id === preferredDriverId)) {
    return { selectedDriverId: preferredDriverId };
  }

  return { selectedDriverId: snapshot.drivers[0]?.id ?? null };
};

export const reconcileSelectionState = (
  snapshot: SessionSnapshot,
  selection: SelectionState
): SelectionState => {
  const selectedStillExists = selection.selectedDriverId
    ? snapshot.drivers.some((driver) => driver.id === selection.selectedDriverId)
    : false;

  if (selectedStillExists) {
    return selection;
  }

  return { selectedDriverId: snapshot.drivers[0]?.id ?? null };
};
