import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ProgressState {
  completedTasks: Set<string>;
  toggleTask: (taskId: string) => void;
  markDone: (taskId: string) => void;
  markUndone: (taskId: string) => void;
  isDone: (taskId: string) => boolean;
  getCompletedCount: (ids: string[]) => number;
  reset: () => void;
}

interface PersistedState {
  completedTaskIds: string[];
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      completedTasks: new Set<string>(),

      toggleTask: (taskId) => {
        const current = get().completedTasks;
        const next = new Set(current);
        if (next.has(taskId)) {
          next.delete(taskId);
        } else {
          next.add(taskId);
        }
        set({ completedTasks: next });
      },

      markDone: (taskId) => {
        const next = new Set(get().completedTasks);
        next.add(taskId);
        set({ completedTasks: next });
      },

      markUndone: (taskId) => {
        const next = new Set(get().completedTasks);
        next.delete(taskId);
        set({ completedTasks: next });
      },

      isDone: (taskId) => get().completedTasks.has(taskId),

      getCompletedCount: (ids) =>
        ids.filter((id) => get().completedTasks.has(id)).length,

      reset: () => set({ completedTasks: new Set() }),
    }),
    {
      name: "runwith-progress",
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          const parsed = JSON.parse(str);
          return {
            ...parsed,
            state: {
              ...parsed.state,
              completedTasks: new Set<string>(parsed.state.completedTaskIds ?? []),
            },
          };
        },
        setItem: (name, value) => {
          const serialized = {
            ...value,
            state: {
              ...value.state,
              completedTaskIds: Array.from(value.state.completedTasks),
              completedTasks: undefined,
            },
          };
          localStorage.setItem(name, JSON.stringify(serialized));
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
    }
  )
);

export const TASK_IDS = {
  // ── Incorporation ──
  INC_FORM: "inc_company_form",
  INC_BASICS: "inc_basics",
  INC_ARTICLES: "inc_articles_of_incorporation",
  INC_NOTARIZATION: "inc_notarization",
  INC_CAPITAL: "inc_capital_payment",
  INC_REGISTRATION: "inc_registration",
  INC_POST_NOTIFICATIONS: "inc_post_notifications",

  // ── Notifications (post-founding) ──
  NOTIF_TAX_ESTABLISHMENT: "notif_tax_establishment",
  NOTIF_BLUE_RETURN: "notif_blue_return",
  NOTIF_SALARY_OFFICE: "notif_salary_office",
  NOTIF_WITHHOLDING_SPECIAL: "notif_withholding_special",
  NOTIF_CONSUMPTION_TAX: "notif_consumption_tax",
  NOTIF_PREF_TAX: "notif_pref_tax",
  NOTIF_CITY_TAX: "notif_city_tax",
  NOTIF_HEALTH_PENSION: "notif_health_pension",
  NOTIF_LABOR_INSURANCE: "notif_labor_insurance",
  NOTIF_EMPLOYMENT_INSURANCE: "notif_employment_insurance",
  NOTIF_MEDICAL_CLINIC: "notif_medical_clinic",
  NOTIF_MEDICAL_DEVICE: "notif_medical_device",

  // ── Bank & Card ──
  BANK_OPENED: "bank_opened",
  BANK_GBIZID: "bank_gbizid",
  CREDIT_APPLIED: "credit_applied",

  // ── Accounting ──
  ACC_SOFTWARE: "acc_software",
  ACC_FISCAL_YEAR: "acc_fiscal_year",

  // ── Idea Stage ──
  IDEA_BUSINESS_PLAN: "idea_business_plan",
  IDEA_MARKET_RESEARCH: "idea_market_research",
  IDEA_COMPETITOR_ANALYSIS: "idea_competitor_analysis",
  IDEA_PERSONA: "idea_persona",
  IDEA_BMC: "idea_bmc",
  IDEA_NAMING: "idea_naming",
  IDEA_TRADEMARK: "idea_trademark",
  IDEA_MEDICAL_PHARMA_CHECK: "idea_medical_pharma_check",

  // ── Pre-founding ──
  PRE_BASICS: "pre_basics_decision",
  PRE_SETUP_SERVICE: "pre_setup_service",
  PRE_ARTICLES: "pre_articles",
  PRE_NOTARIZATION: "pre_notarization",
  PRE_CAPITAL_PAYMENT: "pre_capital_payment",
  PRE_REGISTRATION: "pre_registration",
  PRE_POST_REGISTRATION: "pre_post_registration",

  // Legacy pre-founding (kept for backward compat)
  PRE_COMPANY_TYPE: "pre_company_type",
  PRE_FOUNDERS: "pre_founders",
  PRE_CAPITAL: "pre_capital_amount",
  PRE_ADDRESS: "pre_address",
  PRE_SEAL_CARD: "pre_seal_card",
  PRE_BANK_ACCOUNT: "pre_bank_account",
  PRE_CORP_CARD: "pre_corp_card",
  PRE_GBIZID: "pre_gbizid",
  PRE_ACCOUNTING: "pre_accounting_software",

  // ── Founded Stage ──
  FOUNDED_TAX_NOTIF: "founded_tax_notif",
  FOUNDED_BLUE_RETURN: "founded_blue_return",
  FOUNDED_SALARY_OFFICE: "founded_salary_office",
  FOUNDED_WITHHOLDING: "founded_withholding",
  FOUNDED_CONSUMPTION_TAX: "founded_consumption_tax",
  FOUNDED_PREF_TAX: "founded_pref_tax",
  FOUNDED_CITY_TAX: "founded_city_tax",
  FOUNDED_SOCIAL_INS: "founded_social_ins",
  FOUNDED_LABOR_INS: "founded_labor_ins",
  FOUNDED_EMP_INS: "founded_emp_ins",
  FOUNDED_WORK_RULES: "founded_work_rules",
  FOUNDED_CONTRACTS: "founded_contracts",
  FOUNDED_TAX_CALENDAR: "founded_tax_calendar",
  FOUNDED_MEDICAL_CLINIC: "founded_medical_clinic",
  FOUNDED_MEDICAL_DEVICE: "founded_medical_device",

  // ── Seed Stage ──
  SEED_MVP: "seed_mvp",
  SEED_SIMULATION: "seed_simulation",
  SEED_MARKETING: "seed_marketing",
  SEED_FUNDING_RESEARCH: "seed_funding_research",
  SEED_STARTUP_LOAN: "seed_startup_loan",
  SEED_BUSINESS_PLAN: "seed_business_plan",
  SEED_IP_STRATEGY: "seed_ip_strategy",
  SEED_FIRST_CUSTOMERS: "seed_first_customers",
  SEED_INTERVIEWS: "seed_interviews",
  SEED_KPI: "seed_kpi",
  SEED_LEGAL_DOCS: "seed_legal_docs",
  SEED_MEDICAL_CLINICAL: "seed_medical_clinical",
  SEED_MEDICAL_PMDA: "seed_medical_pmda",

  // ── Early Stage ──
  EARLY_PITCH: "early_pitch",
  EARLY_INVESTOR: "early_investor",
  EARLY_ANGEL_TAX: "early_angel_tax",
  EARLY_HIRING: "early_hiring",
  EARLY_STOCK_OPTION: "early_stock_option",
  EARLY_SALES_PROCESS: "early_sales_process",
  EARLY_CUSTOMER_SUCCESS: "early_customer_success",
  EARLY_PR: "early_pr",
  EARLY_LABOR: "early_labor",
  EARLY_MONTHLY_CLOSING: "early_monthly_closing",

  // ── Series A ──
  SA_FUNDRAISING: "sa_fundraising",
  SA_VALUATION: "sa_valuation",
  SA_INVESTMENT_CONTRACT: "sa_investment_contract",
  SA_SHA: "sa_sha",
  SA_STOCK_OPTIONS: "sa_stock_options",
  SA_EXPANSION_PLAN: "sa_expansion_plan",
  SA_ORG_SCALE: "sa_org_scale",
  SA_HIRING_PLAN: "sa_hiring_plan",
  SA_SECURITY: "sa_security",
  SA_ADVISORS: "sa_advisors",
  SA_MEDICAL_TRIAL: "sa_medical_trial",

  // ── Series B+ ──
  SB_FUNDRAISING: "sb_fundraising",
  SB_DD: "sb_dd",
  SB_GOVERNANCE: "sb_governance",
  SB_INTERNAL_CONTROL: "sb_internal_control",
  SB_OVERSEAS: "sb_overseas",
  SB_MA: "sb_ma_strategy",
  SB_CULTURE: "sb_culture",
  SB_HR_SYSTEM: "sb_hr_system",
  SB_MEDICAL_APPROVAL: "sb_medical_approval",

  // ── Pre-IPO ──
  IPO_ROADMAP: "ipo_roadmap",
  IPO_UNDERWRITER: "ipo_underwriter",
  IPO_AUDITOR: "ipo_auditor",
  IPO_INTERNAL_AUDIT: "ipo_internal_audit",
  IPO_REGULATIONS: "ipo_regulations",
  IPO_PROSPECTUS: "ipo_prospectus",
  IPO_REVIEW: "ipo_review",
  IPO_IR: "ipo_ir",
  IPO_ROADSHOW: "ipo_roadshow",
  IPO_BOOKBUILDING: "ipo_bookbuilding",

  // ── Post Exit ──
  EXIT_DISCLOSURE: "exit_disclosure",
  EXIT_EARNINGS: "exit_earnings",
  EXIT_SO_MANAGEMENT: "exit_so_management",
  EXIT_AGM: "exit_agm",
  EXIT_NEXT_STRATEGY: "exit_next_strategy",
};

export const TASK_GROUPS = {
  incorporation: [
    TASK_IDS.INC_FORM,
    TASK_IDS.INC_BASICS,
    TASK_IDS.INC_ARTICLES,
    TASK_IDS.INC_NOTARIZATION,
    TASK_IDS.INC_CAPITAL,
    TASK_IDS.INC_REGISTRATION,
  ],
  notifications: [
    TASK_IDS.NOTIF_TAX_ESTABLISHMENT,
    TASK_IDS.NOTIF_BLUE_RETURN,
    TASK_IDS.NOTIF_SALARY_OFFICE,
    TASK_IDS.NOTIF_WITHHOLDING_SPECIAL,
    TASK_IDS.NOTIF_PREF_TAX,
    TASK_IDS.NOTIF_CITY_TAX,
    TASK_IDS.NOTIF_HEALTH_PENSION,
    TASK_IDS.NOTIF_LABOR_INSURANCE,
    TASK_IDS.NOTIF_EMPLOYMENT_INSURANCE,
  ],
  bankAndCard: [
    TASK_IDS.BANK_OPENED,
    TASK_IDS.BANK_GBIZID,
    TASK_IDS.CREDIT_APPLIED,
  ],
  accounting: [
    TASK_IDS.ACC_SOFTWARE,
    TASK_IDS.ACC_FISCAL_YEAR,
  ],
  // Journey phase groups for dashboard
  idea: [
    TASK_IDS.IDEA_BUSINESS_PLAN, TASK_IDS.IDEA_MARKET_RESEARCH,
    TASK_IDS.IDEA_COMPETITOR_ANALYSIS, TASK_IDS.IDEA_PERSONA,
    TASK_IDS.IDEA_BMC, TASK_IDS.IDEA_NAMING, TASK_IDS.IDEA_TRADEMARK,
  ],
  pre_founding: [
    TASK_IDS.PRE_COMPANY_TYPE, TASK_IDS.PRE_FOUNDERS, TASK_IDS.PRE_CAPITAL,
    TASK_IDS.PRE_ADDRESS, TASK_IDS.PRE_ARTICLES, TASK_IDS.PRE_NOTARIZATION,
    TASK_IDS.PRE_CAPITAL_PAYMENT, TASK_IDS.PRE_REGISTRATION,
    TASK_IDS.PRE_SEAL_CARD, TASK_IDS.PRE_BANK_ACCOUNT, TASK_IDS.PRE_CORP_CARD,
    TASK_IDS.PRE_GBIZID, TASK_IDS.PRE_ACCOUNTING,
  ],
  founded: [
    TASK_IDS.FOUNDED_TAX_NOTIF, TASK_IDS.FOUNDED_BLUE_RETURN,
    TASK_IDS.FOUNDED_SALARY_OFFICE, TASK_IDS.FOUNDED_WITHHOLDING,
    TASK_IDS.FOUNDED_PREF_TAX, TASK_IDS.FOUNDED_CITY_TAX,
    TASK_IDS.FOUNDED_SOCIAL_INS, TASK_IDS.FOUNDED_LABOR_INS,
    TASK_IDS.FOUNDED_EMP_INS, TASK_IDS.FOUNDED_WORK_RULES,
    TASK_IDS.FOUNDED_CONTRACTS, TASK_IDS.FOUNDED_TAX_CALENDAR,
  ],
  seed: [
    TASK_IDS.SEED_FUNDING_RESEARCH, TASK_IDS.SEED_STARTUP_LOAN,
    TASK_IDS.SEED_BUSINESS_PLAN, TASK_IDS.SEED_MVP,
    TASK_IDS.SEED_IP_STRATEGY, TASK_IDS.SEED_FIRST_CUSTOMERS,
    TASK_IDS.SEED_INTERVIEWS, TASK_IDS.SEED_KPI, TASK_IDS.SEED_LEGAL_DOCS,
  ],
};
