import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import {
  fetchQuoteDirect,
  fetchBatchQuotesDirect,
  fetchComparisonChartsDirect,
  fetchDividendHistoryDirect,
  calculateAverageDividend,
} from "./yahooFinanceDirect.js";
import etfs from "./etfs.json" assert { type: "json" };

const app = express();
const port = process.env.PORT || process.env.YAHOO_SERVER_PORT || 4000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/yahoo-finance", async (req, res) => {
  try {
    const symbol = typeof req.query.symbol === "string" ? req.query.symbol.toUpperCase() : null;
    if (!symbol) {
      return res.status(400).json({ error: "symbol is required" });
    }
    const quote = await fetchQuoteDirect(symbol);
    res.json({ data: quote });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch quote" });
  }
});

const totalReturnsCache = new Map();
const TOTAL_RETURNS_TTL_MS = 6 * 60 * 60 * 1000;

let etfCacheData = null;
let etfCacheTimestamp = 0;
const ETF_TTL_MS = 60 * 1000;

app.get("/api/yahoo-finance/etf", async (req, res) => {
  try {
    const now = Date.now();
    if (etfCacheData && now - etfCacheTimestamp < ETF_TTL_MS) {
      return res.json({ data: etfCacheData });
    }

    const symbols = etfs.map((e) => e.symbol);
    const quotes = await fetchBatchQuotesDirect(symbols);
    
    const dividendPromises = symbols.map(symbol => 
      fetchDividendHistoryDirect(symbol).catch(() => ({ symbol, dividends: [] }))
    );
    const dividendResults = await Promise.all(dividendPromises);
    const dividendMap = {};
    dividendResults.forEach(result => {
      dividendMap[result.symbol] = result.dividends;
    });
    
    const data = etfs.map((base) => {
      const q = quotes[base.symbol] || {};
      const divHistory = dividendMap[base.symbol] || [];
      const avgDividend = calculateAverageDividend(divHistory, base.numPayments || 12);
      
      const forwardYield = q.price && avgDividend ? ((avgDividend * (base.numPayments || 12)) / q.price) * 100 : base.forwardYield ?? null;
      
      const stdDev = base.standardDeviation ?? 0;
      
      return {
        ...base,
        price: q.price ?? base.price ?? null,
        priceChange: q.priceChange ?? base.priceChange ?? null,
        previousClose: q.previousClose ?? null,
        currency: q.currency ?? null,
        exchange: q.exchange ?? null,
        dividend: avgDividend ?? base.dividend ?? null,
        annualDividend: avgDividend ? avgDividend * (base.numPayments || 12) : base.annualDividend ?? null,
        forwardYield: forwardYield,
        standardDeviation: stdDev,
        totalReturn3Mo: base.totalReturn3Mo ?? null,
        totalReturn6Mo: base.totalReturn6Mo ?? null,
        totalReturn12Mo: base.totalReturn12Mo ?? null,
        totalReturn3Yr: base.totalReturn3Yr ?? null,
      };
    });

    etfCacheData = data;
    etfCacheTimestamp = Date.now();

    res.json({ data });
  } catch (error) {
    console.error("[API] /api/yahoo-finance/etf error:", error);
    res.status(500).json({ error: "Failed to fetch ETF data" });
  }
});

app.get("/api/yahoo-finance/total-returns", async (req, res) => {
  try {
    const symbol = typeof req.query.symbol === "string" ? req.query.symbol.toUpperCase() : null;
    if (!symbol) {
      return res.status(400).json({ error: "symbol is required" });
    }
    
    const cacheKey = `total-returns:${symbol}`;
    const cached = totalReturnsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < TOTAL_RETURNS_TTL_MS) {
      return res.json({ data: cached.data });
    }
    
    const result = await fetchComparisonChartsDirect([symbol], "3Y");
    const historical = result.data[symbol] || { timestamps: [], closes: [] };
    
    const calculateTotalReturn = (closes, timestamps, months) => {
      if (!closes || closes.length < 2) return null;
      const currentPrice = closes[closes.length - 1];
      const currentTime = timestamps[timestamps.length - 1];
      const targetTime = currentTime - (months * 30 * 24 * 60 * 60);
      
      let closestIndex = 0;
      let closestDiff = Math.abs(timestamps[0] - targetTime);
      for (let i = 1; i < timestamps.length; i++) {
        const diff = Math.abs(timestamps[i] - targetTime);
        if (diff < closestDiff) {
          closestDiff = diff;
          closestIndex = i;
        }
      }
      
      const pastPrice = closes[closestIndex];
      if (!pastPrice || pastPrice <= 0 || !currentPrice || currentPrice <= 0) return null;
      return ((currentPrice - pastPrice) / pastPrice) * 100;
    };
    
    const returns = {
      symbol,
      totalReturn3Mo: calculateTotalReturn(historical.closes, historical.timestamps, 3),
      totalReturn6Mo: calculateTotalReturn(historical.closes, historical.timestamps, 6),
      totalReturn12Mo: calculateTotalReturn(historical.closes, historical.timestamps, 12),
      totalReturn3Yr: calculateTotalReturn(historical.closes, historical.timestamps, 36),
    };
    
    totalReturnsCache.set(cacheKey, { data: returns, timestamp: Date.now() });
    res.json({ data: returns });
  } catch (error) {
    console.error(`[API] /api/yahoo-finance/total-returns error for ${req.query.symbol}:`, error);
    res.status(500).json({ error: "Failed to fetch total returns" });
  }
});

app.post("/api/yahoo-finance/batch", async (req, res) => {
  try {
    const symbols = Array.isArray(req.body?.symbols) ? req.body.symbols : [];
    if (!symbols.length) {
      return res.status(400).json({ error: "symbols array is required" });
    }
    const upperSymbols = symbols.map((s) =>
      typeof s === "string" ? s.toUpperCase() : s,
    );
    const quotes = await fetchBatchQuotesDirect(upperSymbols);
    res.json({ data: quotes });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch batch quotes" });
  }
});

app.get("/api/yahoo-finance/quick-update", async (req, res) => {
  try {
    const symbolsParam = req.query.symbols;
    let symbols;
    if (typeof symbolsParam === "string" && symbolsParam.length) {
      symbols = symbolsParam
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean);
    } else {
      symbols = etfs.map((e) => e.symbol);
    }
    const quotes = await fetchBatchQuotesDirect(symbols);
    res.json({ data: quotes });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch quick updates" });
  }
});

app.post("/api/yahoo-finance/quick-update", async (req, res) => {
  try {
    const bodySymbols = Array.isArray(req.body?.symbols) ? req.body.symbols : [];
    let symbols;
    if (bodySymbols.length) {
      symbols = bodySymbols
        .map((s) => (typeof s === "string" ? s.trim().toUpperCase() : s))
        .filter(Boolean);
    } else {
      symbols = etfs.map((e) => e.symbol);
    }
    const quotes = await fetchBatchQuotesDirect(symbols);
    res.json({ data: quotes });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch quick updates" });
  }
});

app.post("/api/yahoo-finance", async (req, res) => {
  try {
    const action =
      typeof req.body?.action === "string"
        ? req.body.action
        : "fetchComparisonData";

    if (action === "fetchComparisonData") {
      const symbols = Array.isArray(req.body?.symbols) ? req.body.symbols : [];
      const timeframe =
        typeof req.body?.timeframe === "string" ? req.body.timeframe : "1M";
      if (!symbols.length) {
        return res.status(400).json({ error: "symbols array is required" });
      }
      const upperSymbols = symbols.map((s) =>
        typeof s === "string" ? s.toUpperCase() : s,
      );
      const result = await fetchComparisonChartsDirect(upperSymbols, timeframe);
      return res.json({ data: result });
    }

    if (action === "fetchQuote") {
      const symbol =
        typeof req.body?.symbol === "string"
          ? req.body.symbol.toUpperCase()
          : null;
      if (!symbol) {
        return res.status(400).json({ error: "symbol is required" });
      }
      const quote = await fetchQuoteDirect(symbol);
      return res.json({ data: quote });
    }

    return res.status(400).json({ error: "invalid action" });
  } catch (error) {
    console.error("[API] /api/yahoo-finance error:", error);
    res.status(500).json({
      error: "Failed to handle Yahoo Finance request",
      message: error.message,
    });
  }
});

app.get("/api/yahoo-finance/dividends", async (req, res) => {
  try {
    const symbol =
      typeof req.query.symbol === "string"
        ? req.query.symbol.toUpperCase()
        : null;
    if (!symbol) {
      return res.status(400).json({ error: "symbol is required" });
    }
    const result = await fetchDividendHistoryDirect(symbol);
    res.json({ data: result });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch dividend history" });
  }
});

app.use("/static", express.static(path.join(__dirname)));

app.listen(port, () => {
  process.stdout.write(`Yahoo Finance server listening on port ${port}\n`);
});

import('./schedule-daily-update.js').catch(err => {
  console.error('Failed to start daily update scheduler:', err);
});


