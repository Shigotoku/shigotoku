import { formatCurrency } from "./formatters";

export const currencyFormatter = (v: unknown) => formatCurrency(Number(v || 0), true);
export const absCurrencyFormatter = (v: unknown) => formatCurrency(Math.abs(Number(v || 0)), true);
export const percentFormatter = (v: unknown) => `${v}%`;
