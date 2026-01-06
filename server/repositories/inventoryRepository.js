const Inventory = require('../models/Inventory');

class InventoryRepository {

  async findBySku(sku) {
    return await Inventory.findOne({ sku: sku.toUpperCase() });
  }

  /**
   * Get all inventory items
   */
  async findAll() {
    return await Inventory.find({}).sort({ name: 1 });
  }

  /**
   * Create new inventory item
   */
  async create(itemData) {
    const inventory = new Inventory({
      ...itemData,
      sku: itemData.sku.toUpperCase(),
      availableQuantity: itemData.totalQuantity,
      reservedQuantity: 0
    });
    return await inventory.save();
  }

  /**
   * Update inventory quantities atomically
   * Uses MongoDB's findOneAndUpdate with conditions to prevent race conditions
   */
  async reserveQuantity(sku, quantity) {
    const result = await Inventory.findOneAndUpdate(
      { 
        sku: sku.toUpperCase(),
        availableQuantity: { $gte: quantity }
      },
      {
        $inc: {
          availableQuantity: -quantity,
          reservedQuantity: quantity
        }
      },
      { new: true }
    );
    return result;
  }

  /**
   * Release reserved quantity (cancel or expire reservation)
   */
  async releaseQuantity(sku, quantity) {
    const result = await Inventory.findOneAndUpdate(
      { 
        sku: sku.toUpperCase(),
        reservedQuantity: { $gte: quantity }
      },
      {
        $inc: {
          availableQuantity: quantity,
          reservedQuantity: -quantity
        }
      },
      { new: true }
    );
    return result;
  }

  /**
   * Confirm reservation (reduce reserved, reduce total)
   */
  async confirmQuantity(sku, quantity) {
    const result = await Inventory.findOneAndUpdate(
      { 
        sku: sku.toUpperCase(),
        reservedQuantity: { $gte: quantity }
      },
      {
        $inc: {
          reservedQuantity: -quantity,
          totalQuantity: -quantity
        }
      },
      { new: true }
    );
    return result;
  }

  /**
   * Update inventory item
   */
  async update(sku, updateData) {
    return await Inventory.findOneAndUpdate(
      { sku: sku.toUpperCase() },
      updateData,
      { new: true }
    );
  }

  /**
   * Delete inventory item
   */
  async delete(sku) {
    return await Inventory.findOneAndDelete({ sku: sku.toUpperCase() });
  }
}

module.exports = new InventoryRepository();
