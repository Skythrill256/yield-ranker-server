import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import multer from "multer";
import XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { Resend } from "resend";
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

const resend = new Resend(process.env.RESEND_API_KEY);

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

    // First, convert to array of arrays to find the header row
    const allRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

    let headerRowIndex = 0;
    const maxRowsToScan = 20;

    for (let i = 0; i < Math.min(allRows.length, maxRowsToScan); i++) {
      const row = allRows[i];
      if (!row) continue;

      // Check if this row looks like a header row (contains "Symbol" or "SYMBOL")
      const hasSymbol = row.some(cell =>
        cell && String(cell).trim().toUpperCase() === "SYMBOL"
      );

      if (hasSymbol) {
        headerRowIndex = i;
        break;
      }
    }

    // Now parse with the correct header row
    // range: headerRowIndex tells sheet_to_json to start reading from that row
    const rawData = XLSX.utils.sheet_to_json(sheet, {
      range: headerRowIndex,
      defval: null
    });

    if (!rawData || rawData.length === 0) {
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return res.status(400).json({ error: "Excel file is empty" });
    }

    const headers = Object.keys(rawData[0] || {});
    const headerMap = {};
    headers.forEach((h, idx) => {
      if (!h) return;
      const key = String(h).trim().toLowerCase();
      headerMap[key] = h;
    });

    const findColumn = (...names) => {
      for (const name of names) {
        const key = name.toLowerCase();
        if (headerMap[key] !== undefined) {
          return headerMap[key];
        }
      }
      return null;
    };

    const symbolCol = findColumn('symbol', 'symbols');
    const nameCol = findColumn('name');
    const issuerCol = findColumn('issuer');
    const descCol = findColumn('desc', 'description');
    const payDayCol = findColumn('pay day', 'pay_day');
    const ipoPriceCol = findColumn('ipo price', 'ipo_price');
    const priceCol = findColumn('price', 'current price');
    const priceChangeCol = findColumn('price change', 'price cha');
    const dividendCol = findColumn('dividend');
    const pmtsCol = findColumn('# pmts', '# pmts.', '# pmts ', '# payments');
    const annualDivCol = findColumn('annual div', 'annual dividend');
    const forwardYieldCol = findColumn('forward yield', 'forward y');
    const divVolatilityCol = findColumn('dividend volatility index', 'dividend vo', 'dividend volatility', 'standard deviation', 'std dev');
    const weightedRankCol = findColumn('weighted rank', 'weighted');
    const threeYrCol = findColumn('3 yr annlzd', '3 yr annlz', '3 yr ann.', '3 yr ann', '3 year annualized', '3 yr total return');
    const twelveMonthCol = findColumn('12 month', '12 mo total return', '12 month total return');
    const sixMonthCol = findColumn('6 month', '6 mo total return');
    const threeMonthCol = findColumn('3 month', '3 mo total return');
    const oneMonthCol = findColumn('1 month', '1 mo total return');
    const oneWeekCol = findColumn('1 week', '1 wk total return');
    const week52LowCol = findColumn('52 week low', 'week_52_low');
    const week52HighCol = findColumn('52 week high', 'week_52_high');

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
      const symbolValue = symbolCol ? row[symbolCol] : null;
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
        name: nameCol && row[nameCol] ? String(row[nameCol]).trim() : null,
        issuer: issuerCol && row[issuerCol] ? String(row[issuerCol]).trim() : null,
        description: descCol && row[descCol] ? String(row[descCol]).trim() : null,
        pay_day: payDayCol && row[payDayCol] ? String(row[payDayCol]).trim() : null,
        ipo_price: ipoPriceCol ? parseNumeric(row[ipoPriceCol]) : null,
        price: priceCol ? parseNumeric(row[priceCol]) : null,
        price_change: priceChangeCol ? parseNumeric(row[priceChangeCol]) : null,
        dividend: dividendCol ? parseNumeric(row[dividendCol]) : null,
        payments_per_year: pmtsCol ? parseNumeric(row[pmtsCol]) : null,
        annual_div: annualDivCol ? parseNumeric(row[annualDivCol]) : null,
        forward_yield: forwardYieldCol ? parseNumeric(row[forwardYieldCol]) : null,
        dividend_volatility_index: divVolatilityCol ? parseNumeric(row[divVolatilityCol]) : null,
        weighted_rank: weightedRankCol ? parseNumeric(row[weightedRankCol]) : null,
        three_year_annualized: threeYrCol ? parseNumeric(row[threeYrCol]) : null,
        total_return_12m: twelveMonthCol ? parseNumeric(row[twelveMonthCol]) : null,
        total_return_6m: sixMonthCol ? parseNumeric(row[sixMonthCol]) : null,
        total_return_3m: threeMonthCol ? parseNumeric(row[threeMonthCol]) : null,
        total_return_1m: oneMonthCol ? parseNumeric(row[oneMonthCol]) : null,
        total_return_1w: oneWeekCol ? parseNumeric(row[oneWeekCol]) : null,
        week_52_low: week52LowCol ? parseNumeric(row[week52LowCol]) : null,
        week_52_high: week52HighCol ? parseNumeric(row[week52HighCol]) : null,
      };

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

    const { error: deleteAllError } = await supabase
      .from("etfs")
      .delete()
      .neq("symbol", "");

    if (deleteAllError) {
      console.error("Error clearing existing ETFs:", deleteAllError);
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return res.status(500).json({
        error: "Failed to clear existing data",
        details: deleteAllError.message
      });
    }

    console.log(`Cleared all existing ETFs. Inserting ${etfsToUpsert.length} new ETFs...`);

    const { data, error } = await supabase
      .from("etfs")
      .insert(etfsToUpsert);

    if (error) {
      console.error("Supabase insert error:", error);
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
      ? `Successfully replaced all data with ${etfsToUpsert.length} ETFs (${skippedRows} rows skipped)`
      : `Successfully replaced all data with ${etfsToUpsert.length} ETFs`;

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
      } catch (e) { }
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

    let lastUpdated = null;
    if (data && data.length > 0 && data[0].spreadsheet_updated_at) {
      const timestamp = new Date(data[0].spreadsheet_updated_at);
      const formattedDate = timestamp.toLocaleDateString('en-US', {
        month: 'numeric',
        day: 'numeric',
        year: 'numeric'
      });
      lastUpdated = `EOD ${formattedDate}`;
    }

    res.json({ 
      data: data || [], 
      count: count || 0,
      last_updated: lastUpdated
    });
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

app.get("/api/admin/message", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("site_messages")
      .select("*")
      .eq("message_type", "admin_message")
      .eq("is_active", true)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    res.json({
      success: true,
      data: data || { content: "" }
    });
  } catch (error) {
    console.error("Error fetching admin message:", error);
    res.status(500).json({ error: "Failed to fetch admin message" });
  }
});

app.put("/api/admin/message", async (req, res) => {
  try {
    const { content, is_active } = req.body;

    if (content === undefined) {
      return res.status(400).json({ error: "Content is required" });
    }

    const { data, error } = await supabase
      .from("site_messages")
      .upsert({
        message_type: "admin_message",
        content: content.trim(),
        is_active: is_active !== undefined ? is_active : true
      }, { onConflict: "message_type" })
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: "Admin message updated successfully",
      data
    });
  } catch (error) {
    console.error("Error updating admin message:", error);
    res.status(500).json({ error: "Failed to update admin message" });
  }
});

app.get("/api/disclosure", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("site_messages")
      .select("*")
      .eq("message_type", "disclosure")
      .eq("is_active", true)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    res.json({
      success: true,
      data: data || { content: "This website is for informational purposes only." }
    });
  } catch (error) {
    console.error("Error fetching disclosure:", error);
    res.status(500).json({ error: "Failed to fetch disclosure" });
  }
});

app.put("/api/disclosure", async (req, res) => {
  try {
    const { content, is_active } = req.body;

    if (content === undefined) {
      return res.status(400).json({ error: "Content is required" });
    }

    const { data, error } = await supabase
      .from("site_messages")
      .upsert({
        message_type: "disclosure",
        content: content.trim(),
        is_active: is_active !== undefined ? is_active : true
      }, { onConflict: "message_type" })
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: "Disclosure updated successfully",
      data
    });
  } catch (error) {
    console.error("Error updating disclosure:", error);
    res.status(500).json({ error: "Failed to update disclosure" });
  }
});

app.post("/api/send-email", async (req, res) => {
  try {
    console.log("Incoming email request:", req.body);

    const { subject, html, text } = req.body;

    if (!subject || !html) {
      return res.status(400).json({
        error: "Subject and HTML body are required",
      });
    }

    if (!process.env.RESEND_API_KEY) {
      console.error("RESEND_API_KEY is missing");
      return res.status(500).json({ error: "Email service not configured" });
    }

    // Log what we're sending to Resend
    console.log("Sending email via Resend with:", {
      from: "Yield Ranker <onboarding@resend.dev>",
      to: ["dandtotalreturns@gmail.com"],
      subject,
    });

    const { data, error } = await resend.emails.send({
      from: "Yield Ranker <onboarding@resend.dev>",
      to: ["dandtotalreturns@gmail.com"],
      subject,
      html,
      text: text || "",
    });

    if (error) {
      console.error("Resend error:", error); // EXACT error
      return res.status(400).json({
        success: false,
        error: error.message || error,
      });
    }

    console.log("Email sent successfully:", data);

    res.status(200).json({
      success: true,
      message: "Email sent",
      data,
    });

  } catch (err) {
    console.error("Unexpected server error:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Unexpected error",
    });
  }
});

app.use("/static", express.static(path.join(__dirname)));

app.listen(port, () => {
  process.stdout.write(`Server running on port ${port}\n`);
});

