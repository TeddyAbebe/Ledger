export const SYMBOL_GROUPS = [
  {
    label: "Forex majors",
    options: [
      { value: "EURUSD", name: "Euro / US Dollar" },
      { value: "GBPUSD", name: "Pound / US Dollar" },
      { value: "USDJPY", name: "US Dollar / Yen" },
      { value: "USDCHF", name: "US Dollar / Swiss Franc" },
      { value: "AUDUSD", name: "Aussie / US Dollar" },
      { value: "USDCAD", name: "US Dollar / Canadian Dollar" },
      { value: "NZDUSD", name: "Kiwi / US Dollar" },
    ],
  },
  {
    label: "Forex crosses",
    options: [
      { value: "EURGBP", name: "Euro / Pound" },
      { value: "EURJPY", name: "Euro / Yen" },
      { value: "GBPJPY", name: "Pound / Yen" },
      { value: "AUDJPY", name: "Aussie / Yen" },
      { value: "EURCHF", name: "Euro / Swiss Franc" },
      { value: "GBPCHF", name: "Pound / Swiss Franc" },
    ],
  },
  {
    label: "Metals",
    options: [
      { value: "XAUUSD", name: "Gold" },
      { value: "XAGUSD", name: "Silver" },
    ],
  },
  {
    label: "Indices",
    options: [
      { value: "NAS100", name: "Nasdaq 100" },
      { value: "US30", name: "Dow Jones" },
      { value: "US500", name: "S&P 500" },
      { value: "GER40", name: "DAX 40" },
      { value: "UK100", name: "FTSE 100" },
      { value: "JPN225", name: "Nikkei 225" },
    ],
  },
  {
    label: "Energy",
    options: [
      { value: "USOIL", name: "US Crude Oil" },
      { value: "UKOIL", name: "Brent Crude" },
    ],
  },
  {
    label: "Crypto",
    options: [
      { value: "BTCUSD", name: "Bitcoin" },
      { value: "ETHUSD", name: "Ethereum" },
    ],
  },
] as const

export const SYMBOL_VALUES = SYMBOL_GROUPS.flatMap((group) => group.options.map((o) => o.value))

export function isKnownSymbol(value: string) {
  return SYMBOL_VALUES.includes(value as (typeof SYMBOL_VALUES)[number])
}

export function displaySymbol(symbol: string) {
  if (/^[A-Z]{6}$/.test(symbol)) return `${symbol.slice(0, 3)}/${symbol.slice(3)}`
  return symbol
}

export function symbolMeta(value: string) {
  for (const group of SYMBOL_GROUPS) {
    const option = group.options.find((item) => item.value === value)
    if (option) return { ...option, group: group.label }
  }
  return null
}
