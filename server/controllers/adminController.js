const Inventory = require('../models/Inventory');
const Reservation = require('../models/Reservation');

/**
 * Admin Controller
 * Handles HTTP requests for admin dashboard operations
 */
const adminController = {
  /**
   * GET /admin/stats
   * Get dashboard overview stats
   */
  async getDashboardStats(req, res, next) {
    try {
      // Inventory stats
      const inventoryStats = await Inventory.aggregate([
        {
          $group: {
            _id: null,
            totalProducts: { $sum: 1 },
            totalStock: { $sum: '$totalQuantity' },
            totalAvailable: { $sum: '$availableQuantity' },
            totalReserved: { $sum: '$reservedQuantity' }
          }
        }
      ]);

      // Reservation stats by status
      const reservationStats = await Reservation.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalQuantity: { $sum: '$quantity' }
          }
        }
      ]);

      // Recent reservations (last 24 hours)
      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentReservations = await Reservation.countDocuments({
        createdAt: { $gte: last24Hours }
      });

      // Conversion rate (confirmed / total)
      const totalReservations = await Reservation.countDocuments();
      const confirmedReservations = await Reservation.countDocuments({ status: 'confirmed' });
      const conversionRate = totalReservations > 0 
        ? ((confirmedReservations / totalReservations) * 100).toFixed(1) 
        : 0;

      res.json({
        success: true,
        data: {
          inventory: inventoryStats[0] || {
            totalProducts: 0,
            totalStock: 0,
            totalAvailable: 0,
            totalReserved: 0
          },
          reservations: reservationStats.reduce((acc, stat) => {
            acc[stat._id] = { count: stat.count, quantity: stat.totalQuantity };
            return acc;
          }, {}),
          recentReservations,
          conversionRate: parseFloat(conversionRate),
          totalReservations,
          confirmedReservations
        }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /admin/users/top
   * Get top users by reservations
   */
  async getTopUsers(req, res, next) {
    try {
      const limit = parseInt(req.query.limit) || 10;

      const topUsers = await Reservation.aggregate([
        {
          $group: {
            _id: '$userId',
            totalReservations: { $sum: 1 },
            confirmedOrders: {
              $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] }
            },
            cancelledOrders: {
              $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
            },
            expiredOrders: {
              $sum: { $cond: [{ $eq: ['$status', 'expired'] }, 1, 0] }
            },
            activeOrders: {
              $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
            },
            totalQuantity: { $sum: '$quantity' },
            lastActivity: { $max: '$updatedAt' }
          }
        },
        {
          $addFields: {
            conversionRate: {
              $cond: [
                { $gt: ['$totalReservations', 0] },
                { $multiply: [{ $divide: ['$confirmedOrders', '$totalReservations'] }, 100] },
                0
              ]
            }
          }
        },
        { $sort: { confirmedOrders: -1, totalReservations: -1 } },
        { $limit: limit }
      ]);

      res.json({
        success: true,
        data: topUsers.map((user, index) => ({
          rank: index + 1,
          userId: user._id,
          totalReservations: user.totalReservations,
          confirmedOrders: user.confirmedOrders,
          cancelledOrders: user.cancelledOrders,
          expiredOrders: user.expiredOrders,
          activeOrders: user.activeOrders,
          totalQuantity: user.totalQuantity,
          conversionRate: user.conversionRate.toFixed(1),
          lastActivity: user.lastActivity
        }))
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /admin/products/performance
   * Get product performance stats
   */
  async getProductPerformance(req, res, next) {
    try {
      const products = await Inventory.find().lean();
      
      const productStats = await Promise.all(
        products.map(async (product) => {
          const reservationData = await Reservation.aggregate([
            { $match: { sku: product.sku } },
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 },
                quantity: { $sum: '$quantity' }
              }
            }
          ]);

          const stats = reservationData.reduce((acc, stat) => {
            acc[stat._id] = { count: stat.count, quantity: stat.quantity };
            return acc;
          }, {});

          const totalReservations = reservationData.reduce((sum, s) => sum + s.count, 0);
          const confirmedCount = stats.confirmed?.count || 0;

          return {
            sku: product.sku,
            name: product.name,
            price: product.price,
            totalQuantity: product.totalQuantity,
            availableQuantity: product.availableQuantity,
            reservedQuantity: product.reservedQuantity,
            soldQuantity: product.totalQuantity - product.availableQuantity - product.reservedQuantity,
            totalReservations,
            confirmedOrders: confirmedCount,
            conversionRate: totalReservations > 0 
              ? ((confirmedCount / totalReservations) * 100).toFixed(1)
              : '0.0',
            stockStatus: product.availableQuantity === 0 
              ? 'out_of_stock' 
              : product.availableQuantity <= 5 
                ? 'low_stock' 
                : 'in_stock'
          };
        })
      );

      // Sort by confirmed orders (best sellers first)
      productStats.sort((a, b) => b.confirmedOrders - a.confirmedOrders);

      res.json({
        success: true,
        data: productStats
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /admin/activity
   * Get recent activity feed
   */
  async getRecentActivity(req, res, next) {
    try {
      const limit = parseInt(req.query.limit) || 20;

      const recentActivity = await Reservation.find()
        .sort({ updatedAt: -1 })
        .limit(limit)
        .lean();

      // Enrich with product names
      const skus = [...new Set(recentActivity.map(r => r.sku))];
      const products = await Inventory.find({ sku: { $in: skus } }).lean();
      const productMap = products.reduce((acc, p) => {
        acc[p.sku] = p.name;
        return acc;
      }, {});

      res.json({
        success: true,
        data: recentActivity.map(activity => ({
          reservationId: activity.reservationId,
          userId: activity.userId,
          sku: activity.sku,
          productName: productMap[activity.sku] || activity.sku,
          quantity: activity.quantity,
          status: activity.status,
          createdAt: activity.createdAt,
          updatedAt: activity.updatedAt,
          expiresAt: activity.expiresAt
        }))
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = adminController;
