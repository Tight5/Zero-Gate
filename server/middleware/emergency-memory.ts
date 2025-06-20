
// Emergency Memory Management Middleware
const memoryUsage = process.memoryUsage();
const usedMB = memoryUsage.heapUsed / 1024 / 1024;

// Force garbage collection if memory usage is high
if (usedMB > 200) { // 200MB threshold
  if (global.gc) {
    global.gc();
  }
}

// Limit concurrent requests during high memory usage
let concurrentRequests = 0;
const MAX_CONCURRENT = usedMB > 250 ? 5 : 20;

app.use((req, res, next) => {
  if (concurrentRequests >= MAX_CONCURRENT) {
    return res.status(503).json({ 
      error: 'Server temporarily overloaded',
      retryAfter: 30 
    });
  }
  
  concurrentRequests++;
  res.on('finish', () => {
    concurrentRequests--;
  });
  
  next();
});
