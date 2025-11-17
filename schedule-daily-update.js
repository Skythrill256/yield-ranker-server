import { spawn } from 'child_process';

function runDailyUpdate() {
  console.log(`[${new Date().toISOString()}] Running daily total returns update...`);
  
  const child = spawn('node', ['update-total-returns-daily.js'], {
    cwd: process.cwd(),
    stdio: 'inherit'
  });
  
  child.on('exit', (code) => {
    console.log(`[${new Date().toISOString()}] Daily update completed with code ${code}`);
  });
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function scheduleNextRun() {
  const now = new Date();
  const nextRun = new Date(now);
  nextRun.setHours(2, 0, 0, 0);
  
  if (nextRun <= now) {
    nextRun.setDate(nextRun.getDate() + 1);
  }
  
  const timeUntilRun = nextRun - now;
  console.log(`[${new Date().toISOString()}] Next total returns update scheduled for ${nextRun.toISOString()}`);
  
  setTimeout(() => {
    runDailyUpdate();
    setInterval(runDailyUpdate, MS_PER_DAY);
  }, timeUntilRun);
}

scheduleNextRun();

runDailyUpdate();

console.log('[SCHEDULER] Daily total returns update scheduler started');


