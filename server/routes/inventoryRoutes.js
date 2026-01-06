const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');


// GET /inventory - Get all inventory items
router.get('/', inventoryController.getAllInventory);

// GET /inventory/:sku - Get inventory item by SKU
router.get('/:sku', inventoryController.getInventory);

// POST /inventory - Create new inventory item
router.post('/', inventoryController.createInventory);

// POST /inventory/reserve - Reserve inventory for checkout
router.post('/reserve', inventoryController.reserveInventory);

module.exports = router;
