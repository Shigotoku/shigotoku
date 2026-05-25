import { create } from "zustand";
import { persist } from "zustand/middleware";
import { companyService } from "../services/companies";
import { isFirebaseConfigured } from "../lib/firebase";
import { auditService } from "../services/audit";

export type StartupPhase =
  | "idea"
  | "pre_founding"
  | "founded"
  | "seed"
  | "early"
  | "series_a"
  | "series_b_plus"
  | "pre_ipo"
  | "post_exit";

export type MedicalField =
  | "medical_device"
  | "digital_health"
  | "pharmaceutical"
  | "biotech"
  | "health_tech"
  | "care_tech"
  | "medical_ai"
  | "telemedicine";

export const PHASE_LABELS: Record<StartupPhase, string> = {
  idea: "アイデア段階",
  pre_founding: "創業準備",
  founded: "設立済み",
  seed: "シード",
  early: "アーリー",
  series_a: "シリーズA",
  series_b_plus: "シリーズB以降",
  pre_ipo: "IPO準備",
  post_exit: "EXIT後",
};

export const MEDICAL_FIELD_LABELS: Record<MedicalField, string> = {
  medical_device: "医療機器",
  digital_health: "デジタルヘルス",
  pharmaceutical: "医薬品",
  biotech: "バイオテック",
  health_tech: "ヘルステック",
  care_tech: "介護テック",
  medical_ai: "医療AI",
  telemedicine: "遠隔医療",
};

export interface Company {
  id: string;
  name: string;
  nameKana: string;
  industry: string;
  phase: StartupPhase;
  isMedicalMode: boolean;
  medicalFields: MedicalField[];
  foundedDate: string | null;
  postalCode: string;
  address: string;
  representativeName: string;
  capitalAmount: number;
  employeeCount: number;
  description: string;
}

function dbRowToCompany(row: any): Company {
  return {
    id: row.id,
    name: row.name,
    nameKana: row.name_kana ?? "",
    industry: row.industry ?? "",
    phase: (row.phase ?? "idea") as StartupPhase,
    isMedicalMode: row.is_medical_mode ?? false,
    medicalFields: (row.medical_fields ?? []) as MedicalField[],
    foundedDate: row.founded_date ?? null,
    postalCode: row.postal_code ?? "",
    address: row.address ?? "",
    representativeName: row.representative_name ?? "",
    capitalAmount: row.capital_amount ?? 0,
    employeeCount: row.employee_count ?? 1,
    description: row.description ?? "",
  };
}

function companyToDbInsert(c: Omit<Company, "id"> & { id?: string }) {
  return {
    ...(c.id ? { id: c.id } : {}),
    name: c.name,
    name_kana: c.nameKana,
    industry: c.industry,
    phase: c.phase,
    is_medical_mode: c.isMedicalMode,
    medical_fields: c.medicalFields,
    founded_date: c.foundedDate,
    postal_code: c.postalCode,
    address: c.address,
    representative_name: c.representativeName,
    capital_amount: c.capitalAmount,
    employee_count: c.employeeCount,
    description: c.description,
  };
}

interface CompanyState {
  company: Company | null;
  companies: Company[];
  loading: boolean;

  setCompany: (company: Company) => void;
  updateCompany: (updates: Partial<Company>) => void;
  clearCompany: () => void;

  createCompanyInDB: (userId: string, data: Omit<Company, "id">) => Promise<Company>;
  updateCompanyInDB: (updates: Partial<Company>) => Promise<void>;
  fetchCompanies: (userId: string) => Promise<void>;
}

export const useCompanyStore = create<CompanyState>()(
  persist(
    (set, get) => ({
      company: null,
      companies: [],
      loading: false,

      setCompany: (company) => set({ company }),

      updateCompany: (updates) =>
        set((state) => ({
          company: state.company ? { ...state.company, ...updates } : null,
        })),

      clearCompany: () => set({ company: null, companies: [] }),

      createCompanyInDB: async (userId, data) => {
        if (!isFirebaseConfigured) {
          const company: Company = { ...data, id: `company-${Date.now()}` };
          set({ company, companies: [company] });
          return company;
        }

        set({ loading: true });
        try {
          const row = await companyService.createCompany(
            userId,
            companyToDbInsert(data)
          );
          const company = dbRowToCompany(row);
          set((state) => ({
            company,
            companies: [company, ...state.companies],
          }));

          auditService.log({
            companyId: company.id,
            action: "company.created",
            resourceType: "company",
            resourceId: company.id,
          });

          return company;
        } finally {
          set({ loading: false });
        }
      },

      updateCompanyInDB: async (updates) => {
        const { company } = get();
        if (!company) return;

        const merged = { ...company, ...updates };
        set({ company: merged });

        if (!isFirebaseConfigured) return;

        set({ loading: true });
        try {
          const dbUpdates: Record<string, any> = {};
          if (updates.name !== undefined) dbUpdates.name = updates.name;
          if (updates.nameKana !== undefined) dbUpdates.name_kana = updates.nameKana;
          if (updates.industry !== undefined) dbUpdates.industry = updates.industry;
          if (updates.phase !== undefined) dbUpdates.phase = updates.phase;
          if (updates.isMedicalMode !== undefined) dbUpdates.is_medical_mode = updates.isMedicalMode;
          if (updates.medicalFields !== undefined) dbUpdates.medical_fields = updates.medicalFields;
          if (updates.foundedDate !== undefined) dbUpdates.founded_date = updates.foundedDate;
          if (updates.postalCode !== undefined) dbUpdates.postal_code = updates.postalCode;
          if (updates.address !== undefined) dbUpdates.address = updates.address;
          if (updates.representativeName !== undefined) dbUpdates.representative_name = updates.representativeName;
          if (updates.capitalAmount !== undefined) dbUpdates.capital_amount = updates.capitalAmount;
          if (updates.employeeCount !== undefined) dbUpdates.employee_count = updates.employeeCount;
          if (updates.description !== undefined) dbUpdates.description = updates.description;

          const row = await companyService.updateCompany(company.id, dbUpdates);
          set({ company: dbRowToCompany(row) });

          auditService.log({
            companyId: company.id,
            action: "company.updated",
            resourceType: "company",
            resourceId: company.id,
            metadata: { fields: Object.keys(updates) },
          });
        } finally {
          set({ loading: false });
        }
      },

      fetchCompanies: async (userId) => {
        if (!isFirebaseConfigured) return;

        set({ loading: true });
        try {
          const rows = await companyService.fetchUserCompanies(userId);
          const companies = rows.map(dbRowToCompany);
          set({ companies });

          if (companies.length > 0 && !get().company) {
            set({ company: companies[0] });
          }
        } finally {
          set({ loading: false });
        }
      },
    }),
    {
      name: "runwith-company",
      partialize: (state) => ({
        company: state.company,
      }),
    }
  )
);
