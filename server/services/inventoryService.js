const { v4: uuidv4 } = require('uuid');
const inventoryRepository = require('../repositories/inventoryRepository');
const reservationRepository = require('../repositories/reservationRepository');

// Reservation TTL in minutes (from env or default 5 minutes)
const RESERVATION_TTL_MINUTES = parseInt(process.env.RESERVATION_TTL_MINUTES) || 5;

class InventoryService {

  async getInventory(sku) {
    const inventory = await inventoryRepository.findBySku(sku);
    if (!inventory) {
      throw { status: 404, message: `Inventory item with SKU ${sku} not found` };
    }
    return this._formatInventoryResponse(inventory);
  }


  async getAllInventory() {
    const items = await inventoryRepository.findAll();
    return items.map(item => this._formatInventoryResponse(item));
  }


  async createInventory(itemData) {
    const existing = await inventoryRepository.findBySku(itemData.sku);
    if (existing) {
      throw { status: 409, message: `Inventory item with SKU ${itemData.sku} already exists` };
    }
    const inventory = await inventoryRepository.create(itemData);
    return this._formatInventoryResponse(inventory);
  }

  /**
   * Reserve inventory for checkout
   * Implements idempotency - returns existing active reservation if found
   */
  async reserveInventory(sku, userId, quantity = 1) {
    // Check for existing active reservation (idempotency)
    const existingReservation = await reservationRepository.findActiveReservation(userId, sku);
    if (existingReservation) {
      // Return existing reservation (idempotent behavior)
      return {
        reservationId: existingReservation.reservationId,
        sku: existingReservation.sku,
        quantity: existingReservation.quantity,
        expiresAt: existingReservation.expiresAt,
        message: 'Existing reservation found',
        isExisting: true
      };
    }

    // Check inventory exists
    const inventory = await inventoryRepository.findBySku(sku);
    if (!inventory) {
      throw { status: 404, message: `Inventory item with SKU ${sku} not found` };
    }

    // Check sufficient quantity available
    if (inventory.availableQuantity < quantity) {
      throw { 
        status: 409, 
        message: 'Insufficient inventory available',
        availableQuantity: inventory.availableQuantity,
        requestedQuantity: quantity
      };
    }

    // Attempt atomic reservation
    const updatedInventory = await inventoryRepository.reserveQuantity(sku, quantity);
    if (!updatedInventory) {
      throw { 
        status: 409, 
        message: 'Failed to reserve inventory - item may have been reserved by another user',
        availableQuantity: inventory.availableQuantity
      };
    }

    // Create reservation record
    const reservationId = uuidv4();
    const expiresAt = new Date(Date.now() + RESERVATION_TTL_MINUTES * 60 * 1000);

    const reservation = await reservationRepository.create({
      reservationId,
      sku,
      userId,
      quantity,
      status: 'active',
      expiresAt
    });

    return {
      reservationId: reservation.reservationId,
      sku: reservation.sku,
      quantity: reservation.quantity,
      expiresAt: reservation.expiresAt,
      message: 'Inventory reserved successfully',
      isExisting: false
    };
  }

  async confirmCheckout(reservationId, userId) {
    const reservation = await reservationRepository.findById(reservationId);
    
    if (!reservation) {
      throw { status: 404, message: 'Reservation not found' };
    }

    if (reservation.userId !== userId) {
      throw { status: 403, message: 'Unauthorized - reservation belongs to another user' };
    }

    // Check if already confirmed (idempotency)
    if (reservation.status === 'confirmed') {
      return {
        reservationId: reservation.reservationId,
        status: 'confirmed',
        sku: reservation.sku,
        quantity: reservation.quantity,
        message: 'Checkout already confirmed',
        isAlreadyConfirmed: true
      };
    }

    if (reservation.status === 'cancelled') {
      throw { status: 409, message: 'Reservation has been cancelled' };
    }

    if (reservation.status === 'expired' || reservation.expiresAt < new Date()) {
      if (reservation.status === 'active') {
        await this._handleExpiredReservation(reservation);
      }
      throw { status: 410, message: 'Reservation has expired' };
    }


    const confirmedReservation = await reservationRepository.confirm(reservationId);
    if (!confirmedReservation) {
      throw { status: 409, message: 'Failed to confirm reservation - may have expired' };
    }

    await inventoryRepository.confirmQuantity(reservation.sku, reservation.quantity);

    return {
      reservationId: confirmedReservation.reservationId,
      status: 'confirmed',
      sku: confirmedReservation.sku,
      quantity: confirmedReservation.quantity,
      message: 'Checkout confirmed successfully',
      isAlreadyConfirmed: false
    };
  }

  
  async cancelCheckout(reservationId, userId) {
    const reservation = await reservationRepository.findById(reservationId);
    
    if (!reservation) {
      throw { status: 404, message: 'Reservation not found' };
    }

    if (reservation.userId !== userId) {
      throw { status: 403, message: 'Unauthorized - reservation belongs to another user' };
    }

    if (reservation.status === 'cancelled') {
      return {
        reservationId: reservation.reservationId,
        status: 'cancelled',
        sku: reservation.sku,
        message: 'Reservation already cancelled',
        isAlreadyCancelled: true
      };
    }

    if (reservation.status === 'confirmed') {
      throw { status: 409, message: 'Cannot cancel - checkout already confirmed' };
    }

    if (reservation.status === 'expired') {
      return {
        reservationId: reservation.reservationId,
        status: 'expired',
        sku: reservation.sku,
        message: 'Reservation was already expired',
        isAlreadyCancelled: true
      };
    }

    // Cancel the reservation
    const cancelledReservation = await reservationRepository.cancel(reservationId);
    if (!cancelledReservation) {
      throw { status: 409, message: 'Failed to cancel reservation' };
    }

    // Release inventory back to available
    await inventoryRepository.releaseQuantity(reservation.sku, reservation.quantity);

    return {
      reservationId: cancelledReservation.reservationId,
      status: 'cancelled',
      sku: cancelledReservation.sku,
      quantity: cancelledReservation.quantity,
      message: 'Reservation cancelled successfully',
      isAlreadyCancelled: false
    };
  }

  async _handleExpiredReservation(reservation) {
    const expiredReservation = await reservationRepository.markAsExpired(reservation.reservationId);
    if (expiredReservation) {
      await inventoryRepository.releaseQuantity(reservation.sku, reservation.quantity);
    }
    return expiredReservation;
  }


  async cleanupExpiredReservations() {
    const expiredReservations = await reservationRepository.findExpiredReservations();
    const results = [];

    for (const reservation of expiredReservations) {
      try {
        const result = await this._handleExpiredReservation(reservation);
        if (result) {
          results.push({
            reservationId: reservation.reservationId,
            sku: reservation.sku,
            status: 'cleaned'
          });
        }
      } catch (error) {
        console.error(`Failed to cleanup reservation ${reservation.reservationId}:`, error);
        results.push({
          reservationId: reservation.reservationId,
          sku: reservation.sku,
          status: 'error',
          error: error.message
        });
      }
    }

    return {
      cleanedCount: results.filter(r => r.status === 'cleaned').length,
      results
    };
  }

  async getReservationStatus(reservationId) {
    const reservation = await reservationRepository.findById(reservationId);
    if (!reservation) {
      throw { status: 404, message: 'Reservation not found' };
    }

    // Check if expired but not yet marked
    if (reservation.status === 'active' && reservation.expiresAt < new Date()) {
      await this._handleExpiredReservation(reservation);
      reservation.status = 'expired';
    }

    return {
      reservationId: reservation.reservationId,
      sku: reservation.sku,
      quantity: reservation.quantity,
      status: reservation.status,
      expiresAt: reservation.expiresAt,
      createdAt: reservation.createdAt
    };
  }


  _formatInventoryResponse(inventory) {
    return {
      sku: inventory.sku,
      name: inventory.name,
      description: inventory.description,
      price: inventory.price,
      totalQuantity: inventory.totalQuantity,
      availableQuantity: inventory.availableQuantity,
      reservedQuantity: inventory.reservedQuantity,
      imageUrl: inventory.imageUrl,
      inStock: inventory.availableQuantity > 0
    };
  }
}

module.exports = new InventoryService();
