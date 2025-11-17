import fs from 'fs';
import { fetchComparisonChartsDirect } from './yahooFinanceDirect.js';

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
  return Number((((currentPrice - pastPrice) / pastPrice) * 100).toFixed(2));
};

async function updateTotalReturns() {
  console.log(`[${new Date().toISOString()}] Starting daily total returns update...`);
  
  const etfsPath = './etfs.json';
  const etfs = JSON.parse(fs.readFileSync(etfsPath, 'utf8'));
  
  const batchSize = 10;
  let updatedCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < etfs.length; i += batchSize) {
    const batch = etfs.slice(i, i + batchSize);
    const symbols = batch.map(e => e.symbol);
    
    console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(etfs.length/batchSize)}: ${symbols.join(', ')}`);
    
    const promises = symbols.map(async symbol => {
      try {
        const result = await fetchComparisonChartsDirect([symbol], "3Y");
        const historical = result.data[symbol] || { timestamps: [], closes: [] };
        
        if (historical.timestamps.length > 0 && historical.closes.length > 0) {
          return {
            symbol,
            totalReturn3Mo: calculateTotalReturn(historical.closes, historical.timestamps, 3),
            totalReturn6Mo: calculateTotalReturn(historical.closes, historical.timestamps, 6),
            totalReturn12Mo: calculateTotalReturn(historical.closes, historical.timestamps, 12),
            totalReturn3Yr: calculateTotalReturn(historical.closes, historical.timestamps, 36),
          };
        }
        return null;
      } catch (error) {
        console.error(`Error fetching data for ${symbol}:`, error.message);
        return null;
      }
    });
    
    const results = await Promise.all(promises);
    
    results.forEach((result, idx) => {
      if (result) {
        const etf = batch[idx];
        Object.assign(etf, {
          totalReturn3Mo: result.totalReturn3Mo,
          totalReturn6Mo: result.totalReturn6Mo,
          totalReturn12Mo: result.totalReturn12Mo,
          totalReturn3Yr: result.totalReturn3Yr,
        });
        updatedCount++;
      } else {
        errorCount++;
      }
    });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  fs.writeFileSync(etfsPath, JSON.stringify(etfs, null, 2));
  console.log(`[${new Date().toISOString()}] Update complete: ${updatedCount} ETFs updated, ${errorCount} errors`);
}

updateTotalReturns().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});


