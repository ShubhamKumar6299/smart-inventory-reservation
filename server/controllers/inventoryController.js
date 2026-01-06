const inventoryService = require('../services/inventoryService');

/**
 * Inventory Controller
 * Handles HTTP requests for inventory operations
 */
class InventoryController {

  async getInventory(req, res, next) {
    try {
      const { sku } = req.params;
      const inventory = await inventoryService.getInventory(sku);
      res.json({
        success: true,
        data: inventory
      });
    } catch (error) {
      next(error);
    }
  }


  async getAllInventory(req, res, next) {
    try {
      const inventory = await inventoryService.getAllInventory();
      res.json({
        success: true,
        data: inventory
      });
    } catch (error) {
      next(error);
    }
  }


  async createInventory(req, res, next) {
    try {
      const { sku, name, description, price, totalQuantity, imageUrl } = req.body;

      // Validation
      if (!sku || !name || price === undefined || totalQuantity === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: sku, name, price, totalQuantity'
        });
      }

      const inventory = await inventoryService.createInventory({
        sku,
        name,
        description: description || '',
        price: parseFloat(price),
        totalQuantity: parseInt(totalQuantity),
        imageUrl: imageUrl || ''
      });

      res.status(201).json({
        success: true,
        data: inventory
      });
    } catch (error) {
      next(error);
    }
  }

 
  async reserveInventory(req, res, next) {
    try {
      const { sku, userId, quantity } = req.body;

      // Validation
      if (!sku || !userId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: sku, userId'
        });
      }

      const reservation = await inventoryService.reserveInventory(
        sku,
        userId,
        quantity ? parseInt(quantity) : 1
      );

      res.status(reservation.isExisting ? 200 : 201).json({
        success: true,
        data: reservation
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new InventoryController();
