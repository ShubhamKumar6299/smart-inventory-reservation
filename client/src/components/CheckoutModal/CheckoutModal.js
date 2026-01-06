import React from 'react';
import { useCountdown, formatTime } from '../../hooks/useCountdown';
import './CheckoutModal.css';

const CheckoutModal = ({
  isOpen,
  reservation,
  product,
  onConfirm,
  onCancel,
  onExpire,
  isProcessing,
}) => {
  const timeLeft = useCountdown(reservation?.expiresAt, onExpire);

  if (!isOpen || !reservation) return null;

  const isExpired = timeLeft?.expired;
  const isUrgent = timeLeft && !isExpired && timeLeft.total < 60000; // Less than 1 minute

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>🛒 Complete Your Purchase</h2>
          {!isExpired && (
            <div className={`countdown-timer ${isUrgent ? 'urgent' : ''}`}>
              <span className="timer-label">Time remaining:</span>
              <span className="timer-value">{formatTime(timeLeft)}</span>
            </div>
          )}
        </div>

        {isExpired ? (
          <div className="expired-message">
            <span className="expired-icon">⏰</span>
            <h3>Reservation Expired</h3>
            <p>Your reservation has expired. The item has been released back to inventory.</p>
            <button className="modal-btn secondary" onClick={onCancel}>
              Return to Shop
            </button>
          </div>
        ) : (
          <>
            <div className="reservation-details">
              <div className="product-summary">
                {product?.imageUrl && (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="summary-image"
                  />
                )}
                <div className="summary-info">
                  <h3>{product?.name}</h3>
                  <p className="summary-sku">SKU: {reservation.sku}</p>
                  <p className="summary-quantity">Quantity: {reservation.quantity}</p>
                </div>
              </div>

              <div className="price-summary">
                <div className="price-row">
                  <span>Unit Price</span>
                  <span>${product?.price?.toFixed(2)}</span>
                </div>
                <div className="price-row">
                  <span>Quantity</span>
                  <span>×{reservation.quantity}</span>
                </div>
                <div className="price-row total">
                  <span>Total</span>
                  <span>${(product?.price * reservation.quantity).toFixed(2)}</span>
                </div>
              </div>

              <div className="reservation-info">
                <p>
                  <strong>Reservation ID:</strong>{' '}
                  <code>{reservation.reservationId.slice(0, 8)}...</code>
                </p>
              </div>
            </div>

            <div className="modal-actions">
              <button
                className="modal-btn secondary"
                onClick={onCancel}
                disabled={isProcessing}
              >
                Cancel
              </button>
              <button
                className="modal-btn primary"
                onClick={onConfirm}
                disabled={isProcessing}
              >
                {isProcessing ? '⏳ Processing...' : '✓ Confirm Purchase'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CheckoutModal;
