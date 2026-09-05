import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string | number): string {
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return "—"
  return `${d.toISOString().replace("T", " ").substring(0, 19)} UTC`
}

export function formatShortDate(date: Date | string | number): string {
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return "—"
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ]
  const month = months[d.getUTCMonth()]
  const day = String(d.getUTCDate()).padStart(2, "0")
  const hours = String(d.getUTCHours()).padStart(2, "0")
  const mins = String(d.getUTCMinutes()).padStart(2, "0")
  return `${month} ${day}, ${hours}:${mins}`
}

export function getCurrencyDecimals(currency: string = "EGP"): number {
  const c = currency.toUpperCase()
  if (["KWD", "BHD", "OMR"].includes(c)) return 3
  if (["JPY", "KRW", "VND", "CLP"].includes(c)) return 0
  return 2
}

export function formatMinorUnits(amountMinorUnits: number, currency: string = "EGP"): string {
  const isNegative = amountMinorUnits < 0
  const abs = Math.abs(Math.round(amountMinorUnits))
  const decimals = getCurrencyDecimals(currency)
  const factor = 10 ** decimals
  const major = Math.floor(abs / factor)
  const sign = isNegative ? "-" : ""

  if (decimals === 0) {
    return `${sign}${abs} ${currency.toUpperCase()}`
  }
  const minor = (abs % factor).toString().padStart(decimals, "0")
  return `${sign}${major}.${minor} ${currency.toUpperCase()}`
}

export function formatCurrency(amountMinorUnits: number, currency: string = "EGP"): string {
  return formatMinorUnits(amountMinorUnits, currency)
}

export function safeHttpUrl(value?: string | null): string | undefined {
  if (!value) return undefined
  try {
    const url = new URL(value)
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : undefined
  } catch {
    return undefined
  }
}
