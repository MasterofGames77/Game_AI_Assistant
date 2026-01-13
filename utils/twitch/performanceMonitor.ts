import { logger } from '../logger';
import { connectToWingmanDB } from '../databaseConnections';
import TwitchBotAnalytics from '../../models/TwitchBotAnalytics';

/**
 * Performance thresholds configuration
 */
export interface PerformanceThresholds {
  // Response time thresholds (in milliseconds)
  responseTime: {
    warning: number; // Log warning if exceeded
    critical: number; // Log error if exceeded
  };
  // AI response time thresholds
  aiResponseTime: {
    warning: number;
    critical: number;
  };
  // Database query time thresholds
  dbQueryTime: {
    warning: number;
    critical: number;
  };
  // Error rate thresholds (0-1, where 1 = 100%)
  errorRate: {
    warning: number; // e.g., 0.1 = 10% error rate
    critical: number; // e.g., 0.2 = 20% error rate
  };
  // Cache hit rate thresholds (0-1)
  cacheHitRate: {
    warning: number; // Below this is concerning
    critical: number; // Below this is critical
  };
}

/**
 * Default performance thresholds
 */
const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  responseTime: {
    warning: 2000, // 2 seconds
    critical: 5000 // 5 seconds
  },
  aiResponseTime: {
    warning: 3000, // 3 seconds
    critical: 8000 // 8 seconds
  },
  dbQueryTime: {
    warning: 500, // 500ms
    critical: 2000 // 2 seconds
  },
  errorRate: {
    warning: 0.1, // 10% error rate
    critical: 0.2 // 20% error rate
  },
  cacheHitRate: {
    warning: 0.2, // Below 20% is concerning
    critical: 0.1 // Below 10% is critical
  }
};

/**
 * Performance metric record
 */
export interface PerformanceMetric {
  timestamp: Date;
  channelName?: string;
  operation: string;
  metricType: 'response_time' | 'ai_response_time' | 'db_query_time' | 'api_call_time' | 'error_rate' | 'cache_hit_rate';
  value: number;
  threshold: 'normal' | 'warning' | 'critical';
  metadata?: Record<string, any>;
}

/**
 * Performance alert
 */
export interface PerformanceAlert {
  id: string; // Unique identifier for the alert
  timestamp: Date;
  channelName?: string;
  alertType: 'threshold_exceeded' | 'error_rate_high' | 'performance_degradation' | 'anomaly_detected';
  severity: 'warning' | 'critical';
  message: string;
  metrics: PerformanceMetric[];
  acknowledged: boolean; // Whether the alert has been acknowledged
  acknowledgedAt?: Date; // When the alert was acknowledged
  metadata?: Record<string, any>;
}

/**
 * Performance statistics for a time period
 */
export interface PerformanceStats {
  channelName?: string;
  startDate: Date;
  endDate: Date;
  totalOperations: number;
  avgResponseTime: number;
  avgAIResponseTime: number;
  avgDBQueryTime: number;
  errorRate: number;
  cacheHitRate: number;
  thresholdViolations: {
    warning: number;
    critical: number;
  };
  alerts: PerformanceAlert[];
}

/**
 * Performance Monitor Class
 * Tracks and monitors performance metrics for the Twitch bot
 */
class PerformanceMonitor {
  private thresholds: PerformanceThresholds;
  private metrics: PerformanceMetric[] = [];
  private alerts: PerformanceAlert[] = [];
  private readonly MAX_METRICS_HISTORY = 1000; // Keep last 1000 metrics in memory
  private readonly MAX_ALERTS_HISTORY = 100; // Keep last 100 alerts in memory
  private readonly ALERT_COOLDOWN = 60000; // 1 minute cooldown between similar alerts
  private lastAlertTimes: Map<string, number> = new Map();
  private alertIdCounter: number = 0; // Counter for generating unique alert IDs

  constructor(thresholds?: Partial<PerformanceThresholds>) {
    this.thresholds = {
      ...DEFAULT_THRESHOLDS,
      ...thresholds
    };
  }

  /**
   * Update thresholds
   */
  updateThresholds(thresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = {
      ...this.thresholds,
      ...thresholds
    };
  }

  /**
   * Get current thresholds
   */
  getThresholds(): PerformanceThresholds {
    return { ...this.thresholds };
  }

  /**
   * Record a performance metric
   */
  recordMetric(
    operation: string,
    metricType: PerformanceMetric['metricType'],
    value: number,
    channelName?: string,
    metadata?: Record<string, any>
  ): void {
    const threshold = this.getThresholdLevel(metricType, value);
    
    const metric: PerformanceMetric = {
      timestamp: new Date(),
      channelName,
      operation,
      metricType,
      value,
      threshold,
      metadata
    };

    // Add to metrics history
    this.metrics.push(metric);
    
    // Trim history if too large
    if (this.metrics.length > this.MAX_METRICS_HISTORY) {
      this.metrics.shift();
    }

    // Check if we should alert
    if (threshold !== 'normal') {
      this.checkAndAlert(metric);
    }

    // Log based on threshold
    if (threshold === 'critical') {
      logger.error('Performance metric critical threshold exceeded', {
        operation,
        metricType,
        value,
        thresholdValue: this.getThresholdValue(metricType, 'critical'),
        channelName,
        metadata
      });
    } else if (threshold === 'warning') {
      logger.warn('Performance metric warning threshold exceeded', {
        operation,
        metricType,
        value,
        thresholdValue: this.getThresholdValue(metricType, 'warning'),
        channelName,
        metadata
      });
    } else {
      logger.debug('Performance metric recorded', {
        operation,
        metricType,
        value,
        channelName
      });
    }
  }

  /**
   * Record response time
   */
  recordResponseTime(
    operation: string,
    responseTimeMs: number,
    channelName?: string,
    metadata?: Record<string, any>
  ): void {
    this.recordMetric(operation, 'response_time', responseTimeMs, channelName, metadata);
  }

  /**
   * Record AI response time
   */
  recordAIResponseTime(
    operation: string,
    responseTimeMs: number,
    channelName?: string,
    metadata?: Record<string, any>
  ): void {
    this.recordMetric(operation, 'ai_response_time', responseTimeMs, channelName, metadata);
  }

  /**
   * Record database query time
   */
  recordDBQueryTime(
    operation: string,
    queryTimeMs: number,
    channelName?: string,
    metadata?: Record<string, any>
  ): void {
    this.recordMetric(operation, 'db_query_time', queryTimeMs, channelName, metadata);
  }

  /**
   * Record API call time
   */
  recordAPICallTime(
    operation: string,
    callTimeMs: number,
    channelName?: string,
    metadata?: Record<string, any>
  ): void {
    this.recordMetric(operation, 'api_call_time', callTimeMs, channelName, metadata);
  }

  /**
   * Wrap a database query with performance tracking
   * Convenience method for tracking database operations
   */
  async trackDatabaseQuery<T>(
    operation: string,
    query: () => Promise<T>,
    channelName?: string
  ): Promise<T> {
    const startTime = Date.now();
    try {
      const result = await query();
      const queryTime = Date.now() - startTime;
      this.recordDBQueryTime(operation, queryTime, channelName, {
        success: true,
      });
      return result;
    } catch (error) {
      const queryTime = Date.now() - startTime;
      this.recordDBQueryTime(operation, queryTime, channelName, {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Wrap an API call with performance tracking
   * Convenience method for tracking API operations
   */
  async trackApiCall<T>(
    apiName: string,
    apiCall: () => Promise<T>,
    channelName?: string
  ): Promise<T> {
    const startTime = Date.now();
    try {
      const result = await apiCall();
      const callTime = Date.now() - startTime;
      this.recordAPICallTime(apiName, callTime, channelName, {
        success: true,
      });
      return result;
    } catch (error) {
      const callTime = Date.now() - startTime;
      this.recordAPICallTime(apiName, callTime, channelName, {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Record error rate
   */
  recordErrorRate(
    operation: string,
    errorRate: number,
    channelName?: string,
    metadata?: Record<string, any>
  ): void {
    this.recordMetric(operation, 'error_rate', errorRate, channelName, metadata);
  }

  /**
   * Record cache hit rate
   */
  recordCacheHitRate(
    operation: string,
    cacheHitRate: number,
    channelName?: string,
    metadata?: Record<string, any>
  ): void {
    this.recordMetric(operation, 'cache_hit_rate', cacheHitRate, channelName, metadata);
  }

  /**
   * Get threshold level for a metric
   */
  private getThresholdLevel(
    metricType: PerformanceMetric['metricType'],
    value: number
  ): 'normal' | 'warning' | 'critical' {
    const thresholds = this.getThresholdsForMetric(metricType);
    
    if (value >= thresholds.critical) {
      return 'critical';
    } else if (value >= thresholds.warning) {
      return 'warning';
    }
    
    return 'normal';
  }

  /**
   * Get thresholds for a specific metric type
   */
  private getThresholdsForMetric(metricType: PerformanceMetric['metricType']): { warning: number; critical: number } {
    switch (metricType) {
      case 'response_time':
        return this.thresholds.responseTime;
      case 'ai_response_time':
        return this.thresholds.aiResponseTime;
      case 'db_query_time':
        return this.thresholds.dbQueryTime;
      case 'api_call_time':
        return this.thresholds.responseTime; // Use same as response time
      case 'error_rate':
        return this.thresholds.errorRate;
      case 'cache_hit_rate':
        // For cache hit rate, lower is worse, so we invert the logic
        return {
          warning: 1 - this.thresholds.cacheHitRate.warning,
          critical: 1 - this.thresholds.cacheHitRate.critical
        };
      default:
        return { warning: Infinity, critical: Infinity };
    }
  }

  /**
   * Get threshold value
   */
  private getThresholdValue(
    metricType: PerformanceMetric['metricType'],
    level: 'warning' | 'critical'
  ): number {
    const thresholds = this.getThresholdsForMetric(metricType);
    return level === 'critical' ? thresholds.critical : thresholds.warning;
  }

  /**
   * Check if we should alert and create alert if needed
   */
  private checkAndAlert(metric: PerformanceMetric): void {
    const alertKey = `${metric.metricType}-${metric.channelName || 'global'}-${metric.threshold}`;
    const now = Date.now();
    const lastAlertTime = this.lastAlertTimes.get(alertKey) || 0;

    // Check cooldown
    if (now - lastAlertTime < this.ALERT_COOLDOWN) {
      return; // Still in cooldown
    }

    // Create alert
    const thresholdLevel: 'warning' | 'critical' = metric.threshold === 'critical' ? 'critical' : 'warning';
    const alert: PerformanceAlert = {
      id: `alert-${++this.alertIdCounter}-${Date.now()}`,
      timestamp: new Date(),
      channelName: metric.channelName,
      alertType: 'threshold_exceeded',
      severity: thresholdLevel,
      message: `${metric.operation} ${metric.metricType} exceeded ${metric.threshold} threshold: ${metric.value}ms (threshold: ${this.getThresholdValue(metric.metricType, thresholdLevel)}ms)`,
      metrics: [metric],
      acknowledged: false,
      metadata: metric.metadata
    };

    this.alerts.push(alert);
    this.lastAlertTimes.set(alertKey, now);

    // Trim alerts history
    if (this.alerts.length > this.MAX_ALERTS_HISTORY) {
      this.alerts.shift();
    }

    // Log alert
    if (alert.severity === 'critical') {
      logger.error('Performance alert: Critical threshold exceeded', {
        alertType: alert.alertType,
        message: alert.message,
        channelName: alert.channelName,
        metric: {
          operation: metric.operation,
          metricType: metric.metricType,
          value: metric.value,
          threshold: metric.threshold
        }
      });
    } else {
      logger.warn('Performance alert: Warning threshold exceeded', {
        alertType: alert.alertType,
        message: alert.message,
        channelName: alert.channelName,
        metric: {
          operation: metric.operation,
          metricType: metric.metricType,
          value: metric.value,
          threshold: metric.threshold
        }
      });
    }
  }

  /**
   * Analyze error rate and create alert if high
   */
  analyzeErrorRate(
    channelName: string,
    totalMessages: number,
    failedMessages: number,
    timeWindowMs: number = 60000 // 1 minute default
  ): void {
    if (totalMessages === 0) return;

    const errorRate = failedMessages / totalMessages;
    const operation = `error_rate_analysis_${channelName}`;

    this.recordErrorRate(operation, errorRate, channelName, {
      totalMessages,
      failedMessages,
      timeWindowMs
    });
  }

  /**
   * Analyze cache performance and create alert if low
   */
  analyzeCachePerformance(
    channelName: string,
    cacheHits: number,
    totalRequests: number,
    timeWindowMs: number = 60000
  ): void {
    if (totalRequests === 0) return;

    const cacheHitRate = cacheHits / totalRequests;
    const operation = `cache_performance_analysis_${channelName}`;

    this.recordCacheHitRate(operation, cacheHitRate, channelName, {
      cacheHits,
      totalRequests,
      timeWindowMs
    });
  }

  /**
   * Get performance statistics for a time period
   */
  getPerformanceStats(
    startDate: Date,
    endDate: Date,
    channelName?: string
  ): PerformanceStats {
    const relevantMetrics = this.metrics.filter(m => {
      const inTimeRange = m.timestamp >= startDate && m.timestamp <= endDate;
      const matchesChannel = !channelName || m.channelName === channelName;
      return inTimeRange && matchesChannel;
    });

    const relevantAlerts = this.alerts.filter(a => {
      const inTimeRange = a.timestamp >= startDate && a.timestamp <= endDate;
      const matchesChannel = !channelName || a.channelName === channelName;
      return inTimeRange && matchesChannel;
    });

    const responseTimes = relevantMetrics
      .filter(m => m.metricType === 'response_time')
      .map(m => m.value);
    const aiResponseTimes = relevantMetrics
      .filter(m => m.metricType === 'ai_response_time')
      .map(m => m.value);
    const dbQueryTimes = relevantMetrics
      .filter(m => m.metricType === 'db_query_time')
      .map(m => m.value);
    const errorRates = relevantMetrics
      .filter(m => m.metricType === 'error_rate')
      .map(m => m.value);
    const cacheHitRates = relevantMetrics
      .filter(m => m.metricType === 'cache_hit_rate')
      .map(m => m.value);

    const warningCount = relevantMetrics.filter(m => m.threshold === 'warning').length;
    const criticalCount = relevantMetrics.filter(m => m.threshold === 'critical').length;

    return {
      channelName,
      startDate,
      endDate,
      totalOperations: relevantMetrics.length,
      avgResponseTime: responseTimes.length > 0
        ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
        : 0,
      avgAIResponseTime: aiResponseTimes.length > 0
        ? Math.round(aiResponseTimes.reduce((a, b) => a + b, 0) / aiResponseTimes.length)
        : 0,
      avgDBQueryTime: dbQueryTimes.length > 0
        ? Math.round(dbQueryTimes.reduce((a, b) => a + b, 0) / dbQueryTimes.length)
        : 0,
      errorRate: errorRates.length > 0
        ? errorRates.reduce((a, b) => a + b, 0) / errorRates.length
        : 0,
      cacheHitRate: cacheHitRates.length > 0
        ? cacheHitRates.reduce((a, b) => a + b, 0) / cacheHitRates.length
        : 0,
      thresholdViolations: {
        warning: warningCount,
        critical: criticalCount
      },
      alerts: relevantAlerts
    };
  }

  /**
   * Get recent alerts
   */
  getRecentAlerts(count: number = 10, channelName?: string): PerformanceAlert[] {
    let alerts = this.alerts;
    
    if (channelName) {
      alerts = alerts.filter(a => a.channelName === channelName);
    }

    return alerts
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, count);
  }

  /**
   * Get unacknowledged alerts
   */
  getUnacknowledgedAlerts(channelName?: string): PerformanceAlert[] {
    let alerts = this.alerts.filter(a => !a.acknowledged);
    
    if (channelName) {
      alerts = alerts.filter(a => a.channelName === channelName);
    }

    return alerts
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Acknowledge an alert by ID
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert && !alert.acknowledged) {
      alert.acknowledged = true;
      alert.acknowledgedAt = new Date();
      return true;
    }
    return false;
  }

  /**
   * Acknowledge all alerts for a channel
   */
  acknowledgeAllAlerts(channelName?: string): number {
    let count = 0;
    const now = new Date();
    
    for (const alert of this.alerts) {
      if (!alert.acknowledged) {
        if (!channelName || alert.channelName === channelName) {
          alert.acknowledged = true;
          alert.acknowledgedAt = now;
          count++;
        }
      }
    }
    
    return count;
  }

  /**
   * Get recent metrics
   */
  getRecentMetrics(count: number = 100, channelName?: string): PerformanceMetric[] {
    let metrics = this.metrics;
    
    if (channelName) {
      metrics = metrics.filter(m => m.channelName === channelName);
    }

    return metrics
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, count);
  }

  /**
   * Clear old metrics and alerts
   */
  clearOldData(olderThanMs: number = 24 * 60 * 60 * 1000): void {
    const cutoff = new Date(Date.now() - olderThanMs);
    
    this.metrics = this.metrics.filter(m => m.timestamp >= cutoff);
    this.alerts = this.alerts.filter(a => a.timestamp >= cutoff);
    this.lastAlertTimes.clear(); // Reset alert cooldowns
  }

  /**
   * Generate performance report from in-memory metrics
   */
  generatePerformanceReport(
    channelName?: string,
    days: number = 1
  ): PerformanceStats {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.getPerformanceStats(startDate, endDate, channelName);
  }

  /**
   * Generate performance report from database analytics
   * Useful for historical data beyond what's stored in memory
   */
  async generateReport(
    channelName: string,
    startDate: Date,
    endDate: Date
  ): Promise<PerformanceStats> {
    try {
      await connectToWingmanDB();

      // Query analytics data for the period
      const analytics = await TwitchBotAnalytics.find({
        channelName: channelName.toLowerCase().trim(),
        receivedAt: {
          $gte: startDate,
          $lte: endDate,
        },
      }).lean();

      if (analytics.length === 0) {
        // Return empty stats if no data
        return {
          channelName,
          startDate,
          endDate,
          totalOperations: 0,
          avgResponseTime: 0,
          avgAIResponseTime: 0,
          avgDBQueryTime: 0,
          errorRate: 0,
          cacheHitRate: 0,
          thresholdViolations: {
            warning: 0,
            critical: 0,
          },
          alerts: [],
        };
      }

      // Calculate metrics from analytics data
      const responseTimes = analytics
        .map(a => a.totalTimeMs)
        .filter(t => t > 0);
      
      const aiResponseTimes = analytics
        .map(a => a.aiResponseTimeMs)
        .filter(t => t > 0);

      const totalMessages = analytics.length;
      const failedMessages = analytics.filter(a => !a.success).length;
      const errorRate = totalMessages > 0 ? failedMessages / totalMessages : 0;

      // Calculate averages
      const avgResponseTime = responseTimes.length > 0
        ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
        : 0;
      
      const avgAIResponseTime = aiResponseTimes.length > 0
        ? Math.round(aiResponseTimes.reduce((a, b) => a + b, 0) / aiResponseTimes.length)
        : 0;

      // Count threshold violations
      const responseTimeViolations = analytics.filter(
        a => a.aiResponseTimeMs >= this.thresholds.aiResponseTime.warning
      ).length;

      const errorRateViolations = errorRate >= this.thresholds.errorRate.warning ? 1 : 0;

      // Get alerts for the period
      const periodAlerts = this.alerts.filter(
        a => a.channelName === channelName &&
        a.timestamp >= startDate &&
        a.timestamp <= endDate
      );

      // Calculate cache hit rate
      const cacheHits = analytics.filter(a => a.cacheHit).length;
      const cacheHitRate = totalMessages > 0 ? cacheHits / totalMessages : 0;

      return {
        channelName,
        startDate,
        endDate,
        totalOperations: totalMessages,
        avgResponseTime,
        avgAIResponseTime,
        avgDBQueryTime: 0, // Would need separate tracking in analytics
        errorRate,
        cacheHitRate,
        thresholdViolations: {
          warning: responseTimeViolations + (errorRateViolations > 0 ? 1 : 0),
          critical: analytics.filter(
            a => a.aiResponseTimeMs >= this.thresholds.aiResponseTime.critical
          ).length + (errorRate >= this.thresholds.errorRate.critical ? 1 : 0),
        },
        alerts: periodAlerts,
      };
    } catch (error) {
      logger.error('Error generating performance report from database', {
        error: error instanceof Error ? error.message : String(error),
        channelName,
        startDate,
        endDate,
      });
      throw error;
    }
  }
}

// Singleton instance
let performanceMonitorInstance: PerformanceMonitor | null = null;

/**
 * Get or create the performance monitor instance
 */
export function getPerformanceMonitor(thresholds?: Partial<PerformanceThresholds>): PerformanceMonitor {
  if (!performanceMonitorInstance) {
    performanceMonitorInstance = new PerformanceMonitor(thresholds);
  }
  return performanceMonitorInstance;
}

/**
 * Reset the performance monitor instance (useful for testing)
 */
export function resetPerformanceMonitor(): void {
  performanceMonitorInstance = null;
}

/**
 * Helper function to measure and record operation time
 */
export async function measureOperation<T>(
  operation: string,
  fn: () => Promise<T>,
  channelName?: string,
  metadata?: Record<string, any>
): Promise<T> {
  const monitor = getPerformanceMonitor();
  const startTime = Date.now();

  try {
    const result = await fn();
    const duration = Date.now() - startTime;
    
    monitor.recordResponseTime(operation, duration, channelName, {
      ...metadata,
      success: true
    });

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    monitor.recordResponseTime(operation, duration, channelName, {
      ...metadata,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    throw error;
  }
}

/**
 * Helper function to measure and record database query time
 */
export async function measureDBQuery<T>(
  operation: string,
  query: () => Promise<T>,
  channelName?: string,
  metadata?: Record<string, any>
): Promise<T> {
  const monitor = getPerformanceMonitor();
  const startTime = Date.now();

  try {
    const result = await query();
    const duration = Date.now() - startTime;
    
    monitor.recordDBQueryTime(operation, duration, channelName, {
      ...metadata,
      success: true
    });

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    monitor.recordDBQueryTime(operation, duration, channelName, {
      ...metadata,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    throw error;
  }
}

/**
 * Helper function to measure and record API call time
 */
export async function measureAPICall<T>(
  operation: string,
  apiCall: () => Promise<T>,
  channelName?: string,
  metadata?: Record<string, any>
): Promise<T> {
  const monitor = getPerformanceMonitor();
  const startTime = Date.now();

  try {
    const result = await apiCall();
    const duration = Date.now() - startTime;
    
    monitor.recordAPICallTime(operation, duration, channelName, {
      ...metadata,
      success: true
    });

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    monitor.recordAPICallTime(operation, duration, channelName, {
      ...metadata,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    throw error;
  }
}

