const express = require('express');
const router = express.Router();
const checkoutController = require('../controllers/checkoutController');

/**
 * Checkout Routes
 */

// POST /checkout/confirm - Confirm checkout
router.post('/confirm', checkoutController.confirmCheckout);

// POST /checkout/cancel - Cancel checkout
router.post('/cancel', checkoutController.cancelCheckout);

// GET /checkout/status/:reservationId - Get reservation status
router.get('/status/:reservationId', checkoutController.getReservationStatus);

// POST /checkout/cleanup - Cleanup expired reservations (admin)
router.post('/cleanup', checkoutController.cleanupExpiredReservations);

module.exports = router;
