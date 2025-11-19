import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import multer from "multer";
import * as XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import {
  fetchQuoteDirect,
  fetchBatchQuotesDirect,
  fetchComparisonChartsDirect,
  fetchDividendHistoryDirect,
  calculateAverageDividend,
} from "./yahooFinanceDirect.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env file");
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "upload-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedExts = [".xlsx", ".xls"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only Excel files are allowed"));
    }
  },
});

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/admin/upload-dtr", upload.single("file"), async (req, res) => {
  let filePath = null;
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    filePath = req.file.path;
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(sheet, { defval: null });

    if (!rawData || rawData.length === 0) {
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return res.status(400).json({ error: "Excel file is empty" });
    }

    const columnMapping = {
      SYMBOL: "symbol",
      Symbol: "symbol",
      NAME: "name",
      Name: "name",
      ISSUER: "issuer",
      Issuer: "issuer",
      DESCRIPTION: "description",
      Description: "description",
      DESC: "description",
      "Pay Day": "pay_day",
      "PAY_DAY": "pay_day",
      "IPO PRICE": "ipo_price",
      "IPO Price": "ipo_price",
      "IPO_PRICE": "ipo_price",
      Price: "price",
      PRICE: "price",
      "Current Price": "price",
      "Price Cha": "price_change",
      "Price Change": "price_change",
      "PRICE_CHANGE": "price_change",
      Dividend: "dividend",
      DIVIDEND: "dividend",
      "# Pmts": "payments_per_year",
      "# Payments": "payments_per_year",
      "NUM_PAYMENTS": "payments_per_year",
      "Annual Div": "annual_div",
      "Annual Dividend": "annual_div",
      "ANNUAL_DIVIDEND": "annual_div",
      "Forward Y": "forward_yield",
      "Forward Yield": "forward_yield",
      "FORWARD_YIELD": "forward_yield",
      "Dividend Vo": "dividend_volatility_index",
      "Dividend Volatility": "dividend_volatility_index",
      "Standard Deviation": "dividend_volatility_index",
      "STD_DEV": "dividend_volatility_index",
      "Weighted": "weighted_rank",
      "Weighted Rank": "weighted_rank",
      "3 YR Annlz": "three_year_annualized",
      "3 Year Annualized": "three_year_annualized",
      "3 Yr Total Return": "three_year_annualized",
      "TOTAL_RETURN_3YR": "three_year_annualized",
      "12 Month": "total_return_12m",
      "12 Mo Total Return": "total_return_12m",
      "TOTAL_RETURN_12MO": "total_return_12m",
      "6 Month": "total_return_6m",
      "6 Mo Total Return": "total_return_6m",
      "TOTAL_RETURN_6MO": "total_return_6m",
      "3 Month": "total_return_3m",
      "3 Mo Total Return": "total_return_3m",
      "TOTAL_RETURN_3MO": "total_return_3m",
      "1 Month": "total_return_1m",
      "1 Mo Total Return": "total_return_1m",
      "TOTAL_RETURN_1MO": "total_return_1m",
      "1 Week": "total_return_1w",
      "1 Wk Total Return": "total_return_1w",
      "TOTAL_RETURN_1WK": "total_return_1w",
      "52 Week Low": "week_52_low",
      "WEEK_52_LOW": "week_52_low",
      "52 Week High": "week_52_high",
      "WEEK_52_HIGH": "week_52_high",
    };

    const parseNumeric = (val) => {
      if (val === null || val === undefined || val === "") return null;
      if (typeof val === "number") return val;
      const str = String(val).trim();
      if (str.toLowerCase() === "n/a" || str === "" || str === "-") return null;
      const cleaned = str.replace(/[^0-9.-]/g, "");
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? null : parsed;
    };

    const etfsToUpsert = [];
    const now = new Date().toISOString();
    let skippedRows = 0;

    for (const row of rawData) {
      const symbolValue = row.SYMBOL || row.Symbol || row.symbol;
      if (!symbolValue) {
        skippedRows++;
        continue;
      }

      const symbol = String(symbolValue).trim().toUpperCase();
      if (!symbol) {
        skippedRows++;
        continue;
      }

      const etfData = {
        symbol,
        spreadsheet_updated_at: now,
      };

      for (const [excelCol, dbCol] of Object.entries(columnMapping)) {
        if (excelCol === "SYMBOL" || excelCol === "Symbol") continue;
        
        let value = row[excelCol];
        
        if (value === undefined) {
          for (const key of Object.keys(row)) {
            if (key.toLowerCase() === excelCol.toLowerCase() || key.startsWith(excelCol)) {
              value = row[key];
              break;
            }
          }
        }

        if (dbCol === "issuer" || dbCol === "description" || dbCol === "pay_day" || dbCol === "name") {
          etfData[dbCol] = value ? String(value).trim() : null;
        } else {
          etfData[dbCol] = parseNumeric(value);
        }
      }

      etfsToUpsert.push(etfData);
    }

    if (etfsToUpsert.length === 0) {
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return res.status(400).json({ 
        error: "No valid ETF data found. Make sure SYMBOL column exists and has values." 
      });
    }

    const { data, error } = await supabase
      .from("etfs")
      .upsert(etfsToUpsert, { onConflict: "symbol" });

    if (error) {
      console.error("Supabase upsert error:", error);
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return res.status(500).json({ 
        error: "Failed to save data to database", 
        details: error.message 
      });
    }

    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    const responseMessage = skippedRows > 0 
      ? `Successfully processed ${etfsToUpsert.length} ETFs (${skippedRows} rows skipped)`
      : `Successfully processed ${etfsToUpsert.length} ETFs`;

    res.json({
      success: true,
      count: etfsToUpsert.length,
      message: responseMessage,
    });
  } catch (error) {
    console.error("Upload error:", error);
    
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (e) {}
    }

    res.status(500).json({
      error: "Failed to process Excel file",
      details: error.message,
    });
  }
});

app.get("/api/etfs", async (req, res) => {
  try {
    const { data, error, count } = await supabase
      .from("etfs")
      .select("*", { count: "exact" })
      .order("symbol", { ascending: true });

    if (error) {
      console.error("Supabase fetch error:", error);
      return res.status(500).json({ error: "Failed to fetch ETFs" });
    }

    res.json({ data: data || [], count: count || 0 });
  } catch (error) {
    console.error("Error fetching ETFs:", error);
    res.status(500).json({ error: "Failed to fetch ETFs" });
  }
});

app.get("/api/etfs/:symbol", async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    
    const { data, error } = await supabase
      .from("etfs")
      .select("*")
      .eq("symbol", symbol)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({ error: "ETF not found" });
      }
      console.error("Supabase fetch error:", error);
      return res.status(500).json({ error: "Failed to fetch ETF" });
    }

    res.json({ data });
  } catch (error) {
    console.error("Error fetching ETF:", error);
    res.status(500).json({ error: "Failed to fetch ETF" });
  }
});

app.get("/api/yahoo-finance/returns", async (req, res) => {
  try {
    const symbol = typeof req.query.symbol === "string" ? req.query.symbol.toUpperCase() : null;
    if (!symbol) {
      return res.status(400).json({ error: "symbol is required" });
    }

    const quote = await fetchQuoteDirect(symbol);
    
    const result = await fetchComparisonChartsDirect([symbol], "3Y");
    const historical = result.data[symbol] || { timestamps: [], closes: [] };
    
    const calculateReturn = (closes, timestamps, months) => {
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

    const calculateWeekReturn = (closes, timestamps) => {
      if (!closes || closes.length < 2) return null;
      const currentPrice = closes[closes.length - 1];
      const currentTime = timestamps[timestamps.length - 1];
      const targetTime = currentTime - (7 * 24 * 60 * 60);
      
      let closestIndex = closes.length - 1;
      let closestDiff = Infinity;
      for (let i = closes.length - 1; i >= 0; i--) {
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

    const priceReturn1Wk = calculateWeekReturn(historical.closes, historical.timestamps);
    const priceReturn1Mo = calculateReturn(historical.closes, historical.timestamps, 1);
    const priceReturn3Mo = calculateReturn(historical.closes, historical.timestamps, 3);
    const priceReturn6Mo = calculateReturn(historical.closes, historical.timestamps, 6);
    const priceReturn12Mo = calculateReturn(historical.closes, historical.timestamps, 12);
    const priceReturn3Yr = calculateReturn(historical.closes, historical.timestamps, 36);

    const response = {
      symbol,
      currentPrice: quote.price || null,
      priceChange: quote.priceChange || null,
      priceReturn1Wk,
      priceReturn1Mo,
      priceReturn3Mo,
      priceReturn6Mo,
      priceReturn12Mo,
      priceReturn3Yr,
      totalReturn1Wk: priceReturn1Wk,
      totalReturn1Mo: priceReturn1Mo,
      totalReturn3Mo: priceReturn3Mo,
      totalReturn6Mo: priceReturn6Mo,
      totalReturn12Mo: priceReturn12Mo,
      totalReturn3Yr: priceReturn3Yr,
    };

    res.json(response);
  } catch (error) {
    console.error("Error fetching returns:", error);
    res.status(500).json({ error: "Failed to fetch returns" });
  }
});

app.get("/api/yahoo-finance/dividends", async (req, res) => {
  try {
    const symbol = typeof req.query.symbol === "string" ? req.query.symbol.toUpperCase() : null;
    if (!symbol) {
      return res.status(400).json({ error: "symbol is required" });
    }
    
    const result = await fetchDividendHistoryDirect(symbol);
    res.json(result);
  } catch (error) {
    console.error("Error fetching dividends:", error);
    res.status(500).json({ error: "Failed to fetch dividend history" });
  }
});

app.get("/api/yahoo-finance/etf", async (req, res) => {
  try {
    const symbol = typeof req.query.symbol === "string" ? req.query.symbol.toUpperCase() : null;
    if (!symbol) {
      return res.status(400).json({ error: "symbol is required" });
    }

    const timeframe = typeof req.query.timeframe === "string" ? req.query.timeframe : "1Y";
    const result = await fetchComparisonChartsDirect([symbol], timeframe);
    const historical = result.data[symbol];

    if (!historical || !historical.timestamps || !historical.closes) {
      return res.status(404).json({ error: "No data found for symbol" });
    }

    const chartData = historical.timestamps.map((timestamp, index) => ({
      timestamp,
      close: historical.closes[index],
      high: historical.highs?.[index] || historical.closes[index],
      low: historical.lows?.[index] || historical.closes[index],
      open: historical.opens?.[index] || historical.closes[index],
      volume: historical.volumes?.[index] || 0,
    }));

    res.json({
      symbol,
      data: chartData,
    });
  } catch (error) {
    console.error("Error fetching ETF data:", error);
    res.status(500).json({ error: "Failed to fetch ETF data" });
  }
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
    console.error(`Error fetching total returns for ${req.query.symbol}:`, error);
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
      const { data } = await supabase.from("etfs").select("symbol");
      symbols = data ? data.map(e => e.symbol) : [];
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
      const { data } = await supabase.from("etfs").select("symbol");
      symbols = data ? data.map(e => e.symbol) : [];
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
    console.error("Yahoo Finance error:", error);
    res.status(500).json({
      error: "Failed to handle Yahoo Finance request",
      message: error.message,
    });
  }
});

app.use("/static", express.static(path.join(__dirname)));

app.listen(port, () => {
  process.stdout.write(`Server running on port ${port}\n`);
});
