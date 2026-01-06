const inventoryService = require('../services/inventoryService');

/**
 * Reservation Cleanup Scheduler
 * Periodically cleans up expired reservations and releases inventory
 */
class ReservationCleanup {
  constructor() {
    this.intervalId = null;
    this.cleanupIntervalMs = 60 * 1000; // Run every 1 minute
  }

  /**
   * Start the cleanup scheduler
   */
  start() {
    console.log('🧹 Starting reservation cleanup scheduler...');
    
    // Run immediately on start
    this.runCleanup();
    
    // Schedule periodic cleanup
    this.intervalId = setInterval(() => {
      this.runCleanup();
    }, this.cleanupIntervalMs);
  }

  /**
   * Stop the cleanup scheduler
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('🛑 Reservation cleanup scheduler stopped');
    }
  }

  /**
   * Run cleanup process
   */
  async runCleanup() {
    try {
      const result = await inventoryService.cleanupExpiredReservations();
      if (result.cleanedCount > 0) {
        console.log(`🧹 Cleaned up ${result.cleanedCount} expired reservation(s)`);
      }
    } catch (error) {
      console.error('❌ Error during reservation cleanup:', error.message);
    }
  }
}

module.exports = new ReservationCleanup();
