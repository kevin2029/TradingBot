// Fixed comparison universe: roughly the S&P 100 (largest US companies). Every stock
// is scored against the others, so a score says how it ranks, not just whether it
// passed some thresholds. Edit freely; stocks found through Congress trades,
// contracts or lobbying are added on top.
export const UNIVERSE = [
  'AAPL', 'ABBV', 'ABT', 'ACN', 'ADBE', 'AIG', 'AMD', 'AMGN', 'AMT', 'AMZN', 'AVGO', 'AXP', 'BA', 'BAC', 'BK', 'BKNG', 'BLK', 'BMY',
  'C', 'CAT', 'CHTR', 'CL', 'CMCSA', 'COF', 'COP', 'COST', 'CRM', 'CSCO', 'CVS', 'CVX', 'DE', 'DHR', 'DIS', 'DUK', 'EMR', 'F',
  'FDX', 'GD', 'GE', 'GILD', 'GM', 'GOOGL', 'GS', 'HD', 'HON', 'IBM', 'INTC', 'INTU', 'ISRG', 'JNJ', 'JPM', 'KHC', 'KO', 'LIN',
  'LLY', 'LMT', 'LOW', 'MA', 'MCD', 'MDLZ', 'MDT', 'MET', 'META', 'MMM', 'MO', 'MRK', 'MS', 'MSFT', 'MU', 'NEE', 'NFLX', 'NKE',
  'NOW', 'NVDA', 'ORCL', 'PEP', 'PFE', 'PG', 'PLTR', 'PM', 'PYPL', 'QCOM', 'RTX', 'SBUX', 'SCHW', 'SO', 'SPG', 'T', 'TGT', 'TMO',
  'TMUS', 'TSLA', 'TXN', 'UBER', 'UNH', 'UNP', 'UPS', 'USB', 'V', 'VZ', 'WFC', 'WMT', 'XOM',
]

// Party leadership of the 119th Congress (2025-2026). Research finds leaders' trades
// beat their peers by a wide margin while rank-and-file members do not beat the market.
// Update after each election. Matched on last name + first name inside the member string.
export const CONGRESS_LEADERS = [
  ['Mike', 'Johnson'],
  ['Steve', 'Scalise'],
  ['Tom', 'Emmer'],
  ['Lisa', 'McClain'],
  ['Hakeem', 'Jeffries'],
  ['Katherine', 'Clark'],
  ['Pete', 'Aguilar'],
  ['John', 'Thune'],
  ['John', 'Barrasso'],
  ['Tom', 'Cotton'],
  ['Chuck', 'Grassley'],
  ['Chuck', 'Schumer'],
  ['Dick', 'Durbin'],
]

export function isLeader(member) {
  const m = String(member || '').toLowerCase().replace(/[^a-z ]/g, ' ')
  return CONGRESS_LEADERS.some(([first, last]) => m.includes(last.toLowerCase()) && (m.includes(first.toLowerCase()) || m.includes(first.slice(0, 3).toLowerCase())))
}
