const Reservation = require('../models/Reservation');

class ReservationRepository {
  /**
   * Find reservation by ID
   */
  async findById(reservationId) {
    return await Reservation.findOne({ reservationId });
  }

  /**
   * Find active reservation for user and SKU
   */
  async findActiveReservation(userId, sku) {
    return await Reservation.findOne({
      userId,
      sku: sku.toUpperCase(),
      status: 'active',
      expiresAt: { $gt: new Date() }
    });
  }

  /**
   * Find all active reservations for a SKU
   */
  async findActiveReservationsBySku(sku) {
    return await Reservation.find({
      sku: sku.toUpperCase(),
      status: 'active',
      expiresAt: { $gt: new Date() }
    });
  }

  /**
   * Find all reservations for a user
   */
  async findByUserId(userId) {
    return await Reservation.find({ userId }).sort({ createdAt: -1 });
  }

  /**
   * Create new reservation
   */
  async create(reservationData) {
    const reservation = new Reservation({
      ...reservationData,
      sku: reservationData.sku.toUpperCase()
    });
    return await reservation.save();
  }

  /**
   * Update reservation status atomically
   */
  async updateStatus(reservationId, newStatus, conditions = {}) {
    const query = { reservationId, ...conditions };
    return await Reservation.findOneAndUpdate(
      query,
      { status: newStatus },
      { new: true }
    );
  }

  /**
   * Mark reservation as confirmed
   */
  async confirm(reservationId) {
    return await Reservation.findOneAndUpdate(
      { 
        reservationId,
        status: 'active',
        expiresAt: { $gt: new Date() }
      },
      { status: 'confirmed' },
      { new: true }
    );
  }

  /**
   * Mark reservation as cancelled
   */
  async cancel(reservationId) {
    return await Reservation.findOneAndUpdate(
      { 
        reservationId,
        status: 'active'
      },
      { status: 'cancelled' },
      { new: true }
    );
  }

  /**
   * Find and mark expired reservations
   */
  async findExpiredReservations() {
    return await Reservation.find({
      status: 'active',
      expiresAt: { $lte: new Date() }
    });
  }

  /**
   * Mark reservation as expired
   */
  async markAsExpired(reservationId) {
    return await Reservation.findOneAndUpdate(
      { 
        reservationId,
        status: 'active',
        expiresAt: { $lte: new Date() }
      },
      { status: 'expired' },
      { new: true }
    );
  }

  /**
   * Get all reservations
   */
  async findAll() {
    return await Reservation.find({}).sort({ createdAt: -1 });
  }
}

module.exports = new ReservationRepository();
