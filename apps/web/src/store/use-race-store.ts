import { Driver, RaceFlag, TelemetryTick, AiPrediction } from "@f1/shared";
import { create } from "zustand";

type RaceState = {
  drivers: Driver[];
  ticksByDriver: Record<string, TelemetryTick>;
  selectedDriverId: string | null;
  flag: RaceFlag | null;
  predictions: AiPrediction[];
  fps: number;
  setDrivers: (drivers: Driver[]) => void;
  upsertTick: (tick: TelemetryTick) => void;
  setSelectedDriverId: (driverId: string) => void;
  setFlag: (flag: RaceFlag) => void;
  addPrediction: (prediction: AiPrediction) => void;
  setFps: (fps: number) => void;
};

export const useRaceStore = create<RaceState>((set) => ({
  drivers: [],
  ticksByDriver: {},
  selectedDriverId: null,
  flag: null,
  predictions: [],
  fps: 0,
  setDrivers: (drivers) => set(() => ({ drivers: drivers.map((driver) => ({ ...driver })) })),
  upsertTick: (tick) =>
    set((state) => ({
      ticksByDriver: {
        ...state.ticksByDriver,
        [tick.driverId]: { ...tick }
      }
    })),
  setSelectedDriverId: (driverId) => set(() => ({ selectedDriverId: driverId })),
  setFlag: (flag) => set(() => ({ flag: { ...flag } })),
  addPrediction: (prediction) =>
    set((state) => ({
      predictions: [...state.predictions, { ...prediction }].slice(-12)
    })),
  setFps: (fps) => set(() => ({ fps }))
}));