import { Pool } from '@neondatabase/serverless';

interface PoolMetrics {
  totalConnections: number;
  idleConnections: number;
  activeConnections: number;
  waitingClients: number;
  lastActivity: Date;
}

class ConnectionPoolManager {
  private pools: Map<string, Pool> = new Map();
  private metrics: Map<string, PoolMetrics> = new Map();
  private maxIdleTime = 300000; // 5 minutes
  private cleanupInterval = 60000; // 1 minute
  private maxPoolSize = 20;
  private minPoolSize = 2;

  constructor() {
    this.startCleanupProcess();
    this.startMetricsCollection();
  }

  getPool(connectionString: string): Pool {
    if (!this.pools.has(connectionString)) {
      const pool = new Pool({
        connectionString,
        max: this.maxPoolSize,
        min: this.minPoolSize,
        idleTimeoutMillis: this.maxIdleTime,
        connectionTimeoutMillis: 10000, // 10 seconds
      });

      // Add connection event listeners
      pool.on('connect', () => {
        this.updateMetrics(connectionString);
        console.log('📊 New database connection established');
      });

      pool.on('error', (err) => {
        console.error('🚨 Database pool error:', err);
        this.handlePoolError(connectionString, err);
      });

      this.pools.set(connectionString, pool);
      this.initializeMetrics(connectionString);
    }

    return this.pools.get(connectionString)!;
  }

  private initializeMetrics(connectionString: string) {
    this.metrics.set(connectionString, {
      totalConnections: 0,
      idleConnections: 0,
      activeConnections: 0,
      waitingClients: 0,
      lastActivity: new Date()
    });
  }

  private updateMetrics(connectionString: string) {
    const pool = this.pools.get(connectionString);
    if (!pool) return;

    // Note: @neondatabase/serverless Pool doesn't expose internal metrics
    // We'll track what we can and estimate the rest
    const metrics = this.metrics.get(connectionString);
    if (metrics) {
      metrics.lastActivity = new Date();
      this.metrics.set(connectionString, metrics);
    }
  }

  private handlePoolError(connectionString: string, error: Error) {
    console.error(`🚨 Connection pool error for ${connectionString}:`, error);
    
    // If it's a connection timeout or pool exhaustion, try to recover
    if (error.message.includes('timeout') || error.message.includes('pool')) {
      this.recoverPool(connectionString);
    }
  }

  private async recoverPool(connectionString: string) {
    console.log('🔄 Attempting to recover connection pool...');
    
    const pool = this.pools.get(connectionString);
    if (pool) {
      try {
        // End all connections and recreate pool
        await pool.end();
        this.pools.delete(connectionString);
        
        // Create new pool
        this.getPool(connectionString);
        console.log('✅ Connection pool recovered successfully');
      } catch (error) {
        console.error('❌ Failed to recover connection pool:', error);
      }
    }
  }

  private startCleanupProcess() {
    setInterval(() => {
      this.cleanupIdleConnections();
    }, this.cleanupInterval);
  }

  private async cleanupIdleConnections() {
    const now = Date.now();
    
    for (const [connectionString, metrics] of this.metrics.entries()) {
      const timeSinceLastActivity = now - metrics.lastActivity.getTime();
      
      if (timeSinceLastActivity > this.maxIdleTime * 2) {
        console.log('🧹 Cleaning up idle connection pool');
        const pool = this.pools.get(connectionString);
        if (pool) {
          // Don't end the pool completely, just log that it's been idle
          console.log(`📊 Pool for ${connectionString} has been idle for ${Math.round(timeSinceLastActivity / 1000)}s`);
        }
      }
    }
  }

  private startMetricsCollection() {
    setInterval(() => {
      this.collectMetrics();
    }, 30000); // Every 30 seconds
  }

  private collectMetrics() {
    for (const [connectionString, pool] of this.pools.entries()) {
      const metrics = this.metrics.get(connectionString);
      if (metrics) {
        // Log pool health
        console.log(`📊 Pool metrics for ${connectionString}:`, {
          lastActivity: metrics.lastActivity,
          timeSinceActivity: Math.round((Date.now() - metrics.lastActivity.getTime()) / 1000)
        });
      }
    }
  }

  getPoolHealth(): { [key: string]: any } {
    const health: { [key: string]: any } = {};
    
    for (const [connectionString, metrics] of this.metrics.entries()) {
      const timeSinceLastActivity = Date.now() - metrics.lastActivity.getTime();
      
      health[connectionString] = {
        status: timeSinceLastActivity < this.maxIdleTime ? 'active' : 'idle',
        lastActivity: metrics.lastActivity,
        timeSinceLastActivity: Math.round(timeSinceLastActivity / 1000),
        isHealthy: timeSinceLastActivity < this.maxIdleTime * 3
      };
    }
    
    return health;
  }

  async closeAllPools() {
    console.log('🔄 Closing all connection pools...');
    
    for (const [connectionString, pool] of this.pools.entries()) {
      try {
        await pool.end();
        console.log(`✅ Closed pool for ${connectionString}`);
      } catch (error) {
        console.error(`❌ Error closing pool for ${connectionString}:`, error);
      }
    }
    
    this.pools.clear();
    this.metrics.clear();
  }

  // Health check endpoint data
  getHealthSummary() {
    const pools = Array.from(this.pools.keys());
    const health = this.getPoolHealth();
    
    return {
      totalPools: pools.length,
      activePools: Object.values(health).filter((h: any) => h.status === 'active').length,
      idlePools: Object.values(health).filter((h: any) => h.status === 'idle').length,
      unhealthyPools: Object.values(health).filter((h: any) => !h.isHealthy).length,
      details: health
    };
  }
}

const poolManager = new ConnectionPoolManager();

export { poolManager, ConnectionPoolManager };
export default poolManager;