const inventoryService = require('../services/inventoryService');

/**
 * Checkout Controller
 * Handles HTTP requests for checkout operations
 */
class CheckoutController {
  /**
   * POST /checkout/confirm
   * Confirm checkout and finalize purchase
   */
  async confirmCheckout(req, res, next) {
    try {
      const { reservationId, userId } = req.body;

      // Validation
      if (!reservationId || !userId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: reservationId, userId'
        });
      }

      const result = await inventoryService.confirmCheckout(reservationId, userId);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /checkout/cancel
   * Cancel checkout and release reservation
   */
  async cancelCheckout(req, res, next) {
    try {
      const { reservationId, userId } = req.body;

      // Validation
      if (!reservationId || !userId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: reservationId, userId'
        });
      }

      const result = await inventoryService.cancelCheckout(reservationId, userId);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /checkout/status/:reservationId
   * Get reservation status
   */
  async getReservationStatus(req, res, next) {
    try {
      const { reservationId } = req.params;

      const result = await inventoryService.getReservationStatus(reservationId);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /checkout/cleanup
   * Cleanup expired reservations (admin endpoint)
   */
  async cleanupExpiredReservations(req, res, next) {
    try {
      const result = await inventoryService.cleanupExpiredReservations();

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CheckoutController();
