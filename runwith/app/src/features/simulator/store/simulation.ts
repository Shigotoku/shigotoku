import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createCompanyPersistStorage } from "../../../lib/companyPersistStorage";
import type {
  SimulationData,
  SimulationResult,
  CompanyProfile,
  CoreParams,
  CompetitorData,
  Industry,
  CompanyScale,
  SalesModel,
} from "../types/simulation";
import { getDefaultCoreParams, industryPresets } from "../presets/index";
import { runSimulation } from "../engines/simulationEngine";

interface SimulationState {
  isOnboarded: boolean;
  profile: CompanyProfile;
  coreParams: CoreParams;
  scaleParams: Record<string, number>;
  industryParams: Record<string, number>;
  competitors: CompetitorData[];
  result: SimulationResult | null;

  setProfile: (profile: CompanyProfile) => void;
  setIndustry: (industry: Industry) => void;
  setScale: (scale: CompanyScale) => void;
  setSalesModel: (model: SalesModel) => void;
  completeOnboarding: () => void;
  updateCoreParam: (key: keyof CoreParams, value: number | boolean) => void;
  updateIndustryParam: (key: string, value: number) => void;
  recalculate: () => void;
  resetAll: () => void;
}

const defaultProfile: CompanyProfile = {
  industry: "medical",
  scale: "startup",
  salesModel: "direct",
};

export const useSimulationStore = create<SimulationState>()(
  persist(
    (set, get) => ({
      isOnboarded: false,
      profile: defaultProfile,
      coreParams: getDefaultCoreParams("medical"),
      scaleParams: {},
      industryParams: { ...industryPresets.medical.industryDefaults },
      competitors: [],
      result: null,

      setProfile: (profile) => {
        const coreParams = getDefaultCoreParams(profile.industry);
        const industryParams = { ...industryPresets[profile.industry].industryDefaults };
        set({ profile, coreParams, industryParams });
        setTimeout(() => get().recalculate(), 0);
      },

      setIndustry: (industry) => {
        const profile = { ...get().profile, industry };
        const coreParams = getDefaultCoreParams(industry);
        const industryParams = { ...industryPresets[industry].industryDefaults };
        set({ profile, coreParams, industryParams });
        setTimeout(() => get().recalculate(), 0);
      },

      setScale: (scale) => {
        set({ profile: { ...get().profile, scale } });
        setTimeout(() => get().recalculate(), 0);
      },

      setSalesModel: (salesModel) => {
        set({ profile: { ...get().profile, salesModel } });
        setTimeout(() => get().recalculate(), 0);
      },

      completeOnboarding: () => {
        set({ isOnboarded: true });
        get().recalculate();
      },

      updateCoreParam: (key, value) => {
        set({ coreParams: { ...get().coreParams, [key]: value } });
        setTimeout(() => get().recalculate(), 0);
      },

      updateIndustryParam: (key, value) => {
        set({ industryParams: { ...get().industryParams, [key]: value } });
        setTimeout(() => get().recalculate(), 0);
      },

      recalculate: () => {
        const state = get();
        const simData: SimulationData = {
          profile: state.profile,
          coreParams: state.coreParams,
          scaleParams: state.scaleParams,
          industryParams: state.industryParams,
          competitors: state.competitors,
        };
        const result = runSimulation(simData);
        set({ result });
      },

      resetAll: () => {
        set({
          isOnboarded: false,
          profile: defaultProfile,
          coreParams: getDefaultCoreParams("medical"),
          scaleParams: {},
          industryParams: { ...industryPresets.medical.industryDefaults },
          competitors: [],
          result: null,
        });
      },
    }),
    {
      name: "runwith-simulation",
      storage: createCompanyPersistStorage<SimulationState>(),
    }
  )
);
