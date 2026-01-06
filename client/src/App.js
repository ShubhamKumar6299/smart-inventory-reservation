import React, { useState, useEffect, useCallback } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { v4 as uuidv4 } from 'uuid';
import { inventoryApi, checkoutApi } from './services/api';
import { ProductCard, CheckoutModal } from './components';
import './App.css';

// Generate or retrieve user ID from localStorage
const getUserId = () => {
  let userId = localStorage.getItem('userId');
  if (!userId) {
    userId = uuidv4();
    localStorage.setItem('userId', userId);
  }
  return userId;
};

function App() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reservingSkus, setReservingSkus] = useState(new Set());
  const [currentReservation, setCurrentReservation] = useState(null);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const userId = getUserId();

  // Fetch all products
  const fetchProducts = useCallback(async () => {
    try {
      const response = await inventoryApi.getAll();
      setProducts(response.data.data || []);
    } catch (error) {
      toast.error('Failed to fetch products');
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchProducts();
    
    // Refresh products every 10 seconds
    const interval = setInterval(fetchProducts, 10000);
    return () => clearInterval(interval);
  }, [fetchProducts]);

  // Handle reserve action
  const handleReserve = async (sku) => {
    setReservingSkus((prev) => new Set([...prev, sku]));

    try {
      const response = await inventoryApi.reserve(sku, userId, 1);
      const reservation = response.data.data;

      // Find the product details
      const product = products.find((p) => p.sku === sku);

      setCurrentReservation(reservation);
      setCurrentProduct(product);

      if (reservation.isExisting) {
        toast.info('You already have an active reservation for this item');
      } else {
        toast.success('Item reserved! Complete checkout before time expires.');
      }

      // Refresh products to show updated quantities
      fetchProducts();
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to reserve item';
      toast.error(message);

      // Refresh products in case inventory changed
      fetchProducts();
    } finally {
      setReservingSkus((prev) => {
        const updated = new Set(prev);
        updated.delete(sku);
        return updated;
      });
    }
  };

  // Handle checkout confirmation
  const handleConfirm = async () => {
    if (!currentReservation) return;

    setIsProcessing(true);

    try {
      const response = await checkoutApi.confirm(
        currentReservation.reservationId,
        userId
      );

      if (response.data.data.isAlreadyConfirmed) {
        toast.info('This order was already confirmed');
      } else {
        toast.success('🎉 Purchase confirmed! Thank you for your order.');
      }

      setCurrentReservation(null);
      setCurrentProduct(null);
      fetchProducts();
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to confirm checkout';
      toast.error(message);

      // If reservation expired, close modal
      if (error.response?.status === 410) {
        setCurrentReservation(null);
        setCurrentProduct(null);
        fetchProducts();
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle checkout cancellation
  const handleCancel = async () => {
    if (!currentReservation) {
      setCurrentReservation(null);
      setCurrentProduct(null);
      return;
    }

    setIsProcessing(true);

    try {
      await checkoutApi.cancel(currentReservation.reservationId, userId);
      toast.info('Reservation cancelled');
      fetchProducts();
    } catch (error) {
      // Ignore errors on cancel - item may have already expired
      console.error('Cancel error:', error);
    } finally {
      setIsProcessing(false);
      setCurrentReservation(null);
      setCurrentProduct(null);
    }
  };

  // Handle reservation expiry
  const handleExpire = () => {
    toast.warning('⏰ Your reservation has expired');
    fetchProducts();
  };

  return (
    <div className="app">
      <ToastContainer
        position="top-right"
        autoClose={4000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        theme="colored"
      />

      <header className="app-header">
        <div className="header-content">
          <h1>⚡ Flash Sale</h1>
          <p>Limited stock available - Reserve now!</p>
          <div className="user-info">
            <span className="user-badge">
              👤 User: {userId.slice(0, 8)}...
            </span>
          </div>
        </div>
      </header>

      <main className="main-content">
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner-large">⏳</div>
            <p>Loading products...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📦</span>
            <h2>No Products Available</h2>
            <p>Check back later for new arrivals!</p>
          </div>
        ) : (
          <div className="products-grid">
            {products.map((product) => (
              <ProductCard
                key={product.sku}
                product={product}
                onReserve={handleReserve}
                isReserving={reservingSkus.has(product.sku)}
              />
            ))}
          </div>
        )}
      </main>

      <CheckoutModal
        isOpen={!!currentReservation}
        reservation={currentReservation}
        product={currentProduct}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        onExpire={handleExpire}
        isProcessing={isProcessing}
      />

      <footer className="app-footer">
        <p>
          Smart Inventory Reservation System | Reservation expires in 5 minutes
        </p>
      </footer>
    </div>
  );
}

export default App;
