const quoteCache = new Map();
const chartCache = new Map();
const dividendCache = new Map();

const QUOTE_TTL_MS = 10000;
const CHART_TTL_MS = 60000;
const DIVIDEND_TTL_MS = 6 * 60 * 60 * 1000;
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 500;

function getCacheKey(prefix, key) {
  return `${prefix}:${key}`;
}

function getCached(map, key, ttl) {
  const entry = map.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > ttl) {
    map.delete(key);
    return null;
  }
  return entry.value;
}

function setCached(map, key, value) {
  map.set(key, { value, timestamp: Date.now() });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestWithRetry(url, options = {}, retries = MAX_RETRIES, backoffMs = INITIAL_BACKOFF_MS) {
  const defaultHeaders = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
    Accept: "application/json, text/javascript, */*; q=0.01",
    "Accept-Language": "en-US,en;q=0.9",
    Connection: "keep-alive",
  };
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const mergedHeaders = {
        ...defaultHeaders,
        ...(options.headers || {}),
      };
      const response = await fetch(url, {
        ...options,
        headers: mergedHeaders,
      });
      if (response.ok) {
        return response;
      }
      const status = response.status;
      const isRateLimited = status === 429;
      const isServerError = status >= 500 && status < 600;
      if (!isRateLimited && !isServerError) {
        return response;
      }
      lastError = new Error(`HTTP ${status}`);
    } catch (error) {
      lastError = error;
    }
    if (attempt === retries) {
      if (lastError) {
        throw lastError;
      }
      break;
    }
    await wait(backoffMs);
    backoffMs *= 2;
  }
  if (lastError) {
    throw lastError;
  }
  throw new Error("Request failed");
}

export async function fetchQuoteDirect(symbol) {
  const cacheKey = getCacheKey("quote", symbol);
  const cached = getCached(quoteCache, cacheKey, QUOTE_TTL_MS);
  if (cached) return cached;

  const url = new URL("https://query1.finance.yahoo.com/v7/finance/quote");
  url.searchParams.set("symbols", symbol);
  const response = await requestWithRetry(url);
  if (!response.ok) {
    throw new Error("Failed to fetch quote");
  }
  const json = await response.json();
  const result = json.quoteResponse?.result?.[0] || {};
  const mapped = {
    symbol,
    price: result.regularMarketPrice ?? null,
    priceChange: result.regularMarketChange ?? null,
    previousClose: result.regularMarketPreviousClose ?? null,
    currency: result.currency ?? null,
    exchange: result.fullExchangeName ?? null,
  };

  setCached(quoteCache, cacheKey, mapped);
  return mapped;
}

export async function fetchBatchQuotesDirect(symbols) {
  const results = {};
  const tasks = [];

  for (const symbol of symbols) {
    const cacheKey = getCacheKey("quote", symbol);
    const cached = getCached(quoteCache, cacheKey, QUOTE_TTL_MS);
    if (cached) {
      results[symbol] = cached;
    } else {
      tasks.push(
        fetchQuoteDirect(symbol)
          .then((mapped) => {
            results[symbol] = mapped;
          })
          .catch(() => {
            results[symbol] = {
              symbol,
              price: null,
              priceChange: null,
              previousClose: null,
              currency: null,
              exchange: null,
            };
          }),
      );
    }
  }

  if (tasks.length) {
    await Promise.all(tasks);
  }

  return results;
}

function mapTimeframeToChartParams(timeframe) {
  switch (timeframe) {
    case "1D":
      return { range: "1d", interval: "5m" };
    case "1W":
      return { range: "5d", interval: "30m" };
    case "1M":
      return { range: "1mo", interval: "1d" };
    case "3M":
      return { range: "3mo", interval: "1d" };
    case "6M":
      return { range: "6mo", interval: "1d" };
    case "YTD":
      return { range: "ytd", interval: "1d" };
    case "1Y":
      return { range: "1y", interval: "1d" };
    case "3Y":
      return { range: "3y", interval: "1wk" };
    case "5Y":
      return { range: "5y", interval: "1wk" };
    case "10Y":
    case "20Y":
    case "MAX":
      return { range: "max", interval: "1mo" };
    default:
      return { range: "1mo", interval: "1d" };
  }
}

export async function fetchChartDirect(symbol, timeframe) {
  const { range, interval } = mapTimeframeToChartParams(timeframe);
  const cacheKey = getCacheKey("chart", `${symbol}:${range}:${interval}`);
  const cached = getCached(chartCache, cacheKey, CHART_TTL_MS);
  if (cached) return cached;

  try {
    const url = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`);
    url.searchParams.set("range", range);
    url.searchParams.set("interval", interval);
    const response = await requestWithRetry(url);
    if (!response.ok) {
      console.error(`[Yahoo] Chart fetch failed for ${symbol}: ${response.status}`);
      return {
        symbol,
        timeframe,
        timestamps: [],
        closes: [],
      };
    }
    const json = await response.json();
    const result = json.chart?.result?.[0] || {};
    const timestamps = result.timestamp || [];
    const quotes = result.indicators?.quote?.[0] || {};
    const rawCloses = quotes.close || [];

    const cleanedData = [];
    for (let i = 0; i < timestamps.length; i++) {
      const close = rawCloses[i];
      if (close != null && !isNaN(close) && timestamps[i] != null) {
        cleanedData.push({
          timestamp: timestamps[i],
          close: close,
        });
      }
    }

    const mapped = {
      symbol,
      timeframe,
      timestamps: cleanedData.map(d => d.timestamp),
      closes: cleanedData.map(d => d.close),
    };

    setCached(chartCache, cacheKey, mapped);
    return mapped;
  } catch (error) {
    console.error(`[Yahoo] Chart error for ${symbol}:`, error);
    return {
      symbol,
      timeframe,
      timestamps: [],
      closes: [],
    };
  }
}

export async function fetchComparisonChartsDirect(symbols, timeframe) {
  const tasks = symbols.map((s) => fetchChartDirect(s, timeframe));
  const results = await Promise.all(tasks);
  const data = {};
  for (const r of results) {
    data[r.symbol] = {
      timestamps: r.timestamps,
      closes: r.closes,
    };
  }
  return {
    symbols,
    timeframe,
    data,
  };
}

export async function fetchDividendHistoryDirect(symbol) {
  const cacheKey = getCacheKey("dividends", symbol);
  const cached = getCached(dividendCache, cacheKey, DIVIDEND_TTL_MS);
  if (cached) return cached;

  try {
    const url = new URL(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
        symbol,
      )}`,
    );
    url.searchParams.set("range", "max");
    url.searchParams.set("interval", "1d");
    url.searchParams.set("events", "div,splits");
    const response = await requestWithRetry(url);
    if (!response.ok) {
      console.error(`[Yahoo] Dividend fetch failed for ${symbol}: ${response.status}`);
      return { symbol, dividends: [] };
    }
    const json = await response.json();
    const result = json.chart?.result?.[0] || {};
    const divs = result.events?.dividends || {};
    const splits = result.events?.splits || {};
    
    const splitArray = Object.keys(splits)
      .map((key) => {
        const item = splits[key];
        const ts = item.date || item.timestamp || Number(key);
        return {
          date: ts * 1000,
          ratio: Number(item.numerator ?? 1) / Number(item.denominator ?? 1),
        };
      })
      .sort((a, b) => a.date - b.date);

    const history = Object.keys(divs)
      .map((key) => {
        const item = divs[key];
        const ts = item.date || item.timestamp || Number(key);
        const divDate = ts * 1000;
        const originalAmount = Number(item.amount ?? 0);
        
        let adjustedAmount = originalAmount;
        for (const split of splitArray) {
          if (split.date > divDate) {
            adjustedAmount *= split.ratio;
          }
        }
        
        if (adjustedAmount !== originalAmount && splitArray.length > 0) {
          console.log(`[${symbol}] Adjusted dividend: ${originalAmount.toFixed(4)} -> ${adjustedAmount.toFixed(4)}`);
        }
        
        return {
          date: new Date(divDate).toISOString().slice(0, 10),
          dividend: adjustedAmount,
        };
      })
      .filter((d) => d.dividend > 0)
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

    const mapped = {
      symbol,
      dividends: history,
    };
    setCached(dividendCache, cacheKey, mapped);
    return mapped;
  } catch (error) {
    console.error(`[Yahoo] Dividend error for ${symbol}:`, error);
    return { symbol, dividends: [] };
  }
}

export function calculateAverageDividend(dividends, numPayments = 12) {
  if (!dividends || dividends.length === 0) return null;
  
  const sum = dividends.reduce((acc, d) => acc + d.dividend, 0);
  const average = sum / dividends.length;
  
  return average;
}



