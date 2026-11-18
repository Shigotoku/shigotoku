import { useCompanyStorageState } from "./useCompanyStorageState";

/** 会社の決算月（1〜12）。税務カレンダー・決算申告ナビなど全機能で共有する */
export const FISCAL_END_MONTH_KEY = "fiscal-end-month";

export function useFiscalEndMonth() {
  return useCompanyStorageState<number>(FISCAL_END_MONTH_KEY, 3);
}
