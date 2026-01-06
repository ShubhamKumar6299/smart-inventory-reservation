const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

/**
 * Admin Routes
 * Endpoints for admin dashboard
 */

// Dashboard overview stats
router.get('/stats', adminController.getDashboardStats);

// User rankings
router.get('/users/top', adminController.getTopUsers);

// Product performance
router.get('/products/performance', adminController.getProductPerformance);

// Recent activity feed
router.get('/activity', adminController.getRecentActivity);

module.exports = router;
