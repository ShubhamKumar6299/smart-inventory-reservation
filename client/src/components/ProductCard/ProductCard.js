import React from 'react';
import './ProductCard.css';

const ProductCard = ({ product, onReserve, isReserving }) => {
  const { sku, name, description, price, availableQuantity, imageUrl } = product;
  
  const isLowStock = availableQuantity > 0 && availableQuantity <= 5;
  const isOutOfStock = availableQuantity === 0;

  return (
    <div className={`product-card ${isOutOfStock ? 'out-of-stock' : ''}`}>
      <div className="product-image-container">
        <img
          src={imageUrl || 'https://via.placeholder.com/300x200?text=No+Image'}
          alt={name}
          className="product-image"
        />
        {isLowStock && !isOutOfStock && (
          <span className="stock-badge low-stock">
            Only {availableQuantity} left!
          </span>
        )}
        {isOutOfStock && (
          <span className="stock-badge sold-out">
            Sold Out
          </span>
        )}
      </div>
      
      <div className="product-info">
        <h3 className="product-name">{name}</h3>
        <p className="product-sku">SKU: {sku}</p>
        <p className="product-description">{description}</p>
        
        <div className="product-footer">
          <div className="price-container">
            <span className="product-price">${price.toFixed(2)}</span>
            <span className="product-stock">
              {availableQuantity} available
            </span>
          </div>
          
          <button
            className={`reserve-btn ${isOutOfStock ? 'disabled' : ''}`}
            onClick={() => onReserve(sku)}
            disabled={isOutOfStock || isReserving}
          >
            {isReserving ? (
              <span className="loading-spinner">⏳</span>
            ) : isOutOfStock ? (
              'Sold Out'
            ) : (
              'Reserve Now'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
