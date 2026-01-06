import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import './AdminDashboard.css';

const AdminDashboard = ({ onClose }) => {
  const [stats, setStats] = useState(null);
  const [topUsers, setTopUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [activity, setActivity] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, usersRes, productsRes, activityRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/users/top?limit=10'),
        api.get('/admin/products/performance'),
        api.get('/admin/activity?limit=15')
      ]);

      setStats(statsRes.data.data);
      setTopUsers(usersRes.data.data);
      setProducts(productsRes.data.data);
      setActivity(activityRes.data.data);
      setError(null);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      active: '#3498db',
      confirmed: '#27ae60',
      cancelled: '#e74c3c',
      expired: '#95a5a6'
    };
    return colors[status] || '#7f8c8d';
  };

  const getStockStatusBadge = (status) => {
    const badges = {
      in_stock: { label: 'In Stock', color: '#27ae60' },
      low_stock: { label: 'Low Stock', color: '#f39c12' },
      out_of_stock: { label: 'Out of Stock', color: '#e74c3c' }
    };
    return badges[status] || badges.in_stock;
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading && !stats) {
    return (
      <div className="admin-dashboard-overlay">
        <div className="admin-dashboard">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard-overlay">
      <div className="admin-dashboard">
        <div className="dashboard-header">
          <h2>📊 Admin Dashboard</h2>
          <div className="header-actions">
            <button className="refresh-btn" onClick={fetchDashboardData} disabled={loading}>
              {loading ? '⏳' : '🔄'} Refresh
            </button>
            <button className="close-btn" onClick={onClose}>✕</button>
          </div>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <div className="dashboard-tabs">
          <button 
            className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            📈 Overview
          </button>
          <button 
            className={`tab ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            👥 User Rankings
          </button>
          <button 
            className={`tab ${activeTab === 'products' ? 'active' : ''}`}
            onClick={() => setActiveTab('products')}
          >
            📦 Products
          </button>
          <button 
            className={`tab ${activeTab === 'activity' ? 'active' : ''}`}
            onClick={() => setActiveTab('activity')}
          >
            📋 Activity
          </button>
        </div>

        <div className="dashboard-content">
          {/* Overview Tab */}
          {activeTab === 'overview' && stats && (
            <div className="overview-tab">
              <div className="stats-grid">
                <div className="stat-card primary">
                  <div className="stat-icon">📦</div>
                  <div className="stat-info">
                    <h3>{stats.inventory.totalProducts}</h3>
                    <p>Total Products</p>
                  </div>
                </div>
                <div className="stat-card success">
                  <div className="stat-icon">✅</div>
                  <div className="stat-info">
                    <h3>{stats.confirmedReservations}</h3>
                    <p>Confirmed Orders</p>
                  </div>
                </div>
                <div className="stat-card warning">
                  <div className="stat-icon">🔒</div>
                  <div className="stat-info">
                    <h3>{stats.inventory.totalReserved}</h3>
                    <p>Reserved Items</p>
                  </div>
                </div>
                <div className="stat-card info">
                  <div className="stat-icon">📊</div>
                  <div className="stat-info">
                    <h3>{stats.conversionRate}%</h3>
                    <p>Conversion Rate</p>
                  </div>
                </div>
              </div>

              <div className="overview-details">
                <div className="detail-card">
                  <h4>📈 Inventory Overview</h4>
                  <div className="progress-bars">
                    <div className="progress-item">
                      <span>Available Stock</span>
                      <div className="progress-bar">
                        <div 
                          className="progress-fill available"
                          style={{ 
                            width: `${stats.inventory.totalStock > 0 ? (stats.inventory.totalAvailable / stats.inventory.totalStock) * 100 : 0}%` 
                          }}
                        ></div>
                      </div>
                      <span>{stats.inventory.totalAvailable} / {stats.inventory.totalStock}</span>
                    </div>
                    <div className="progress-item">
                      <span>Reserved</span>
                      <div className="progress-bar">
                        <div 
                          className="progress-fill reserved"
                          style={{ 
                            width: `${stats.inventory.totalStock > 0 ? (stats.inventory.totalReserved / stats.inventory.totalStock) * 100 : 0}%` 
                          }}
                        ></div>
                      </div>
                      <span>{stats.inventory.totalReserved} / {stats.inventory.totalStock}</span>
                    </div>
                  </div>
                </div>

                <div className="detail-card">
                  <h4>📋 Reservation Status</h4>
                  <div className="status-breakdown">
                    {Object.entries(stats.reservations).map(([status, data]) => (
                      <div key={status} className="status-item">
                        <span 
                          className="status-dot"
                          style={{ backgroundColor: getStatusColor(status) }}
                        ></span>
                        <span className="status-label">{status}</span>
                        <span className="status-count">{data.count}</span>
                      </div>
                    ))}
                    {Object.keys(stats.reservations).length === 0 && (
                      <p className="no-data">No reservations yet</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* User Rankings Tab */}
          {activeTab === 'users' && (
            <div className="users-tab">
              <h3>🏆 Top Users by Confirmed Orders</h3>
              {topUsers.length > 0 ? (
                <div className="users-table-container">
                  <table className="users-table">
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>User ID</th>
                        <th>Confirmed</th>
                        <th>Cancelled</th>
                        <th>Expired</th>
                        <th>Active</th>
                        <th>Conv. Rate</th>
                        <th>Last Active</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topUsers.map((user) => (
                        <tr key={user.userId} className={user.rank <= 3 ? `top-${user.rank}` : ''}>
                          <td>
                            <span className="rank-badge">
                              {user.rank === 1 ? '🥇' : user.rank === 2 ? '🥈' : user.rank === 3 ? '🥉' : `#${user.rank}`}
                            </span>
                          </td>
                          <td className="user-id">{user.userId}</td>
                          <td className="confirmed">{user.confirmedOrders}</td>
                          <td className="cancelled">{user.cancelledOrders}</td>
                          <td className="expired">{user.expiredOrders}</td>
                          <td className="active-col">{user.activeOrders}</td>
                          <td>
                            <span className={`rate ${parseFloat(user.conversionRate) >= 50 ? 'good' : 'low'}`}>
                              {user.conversionRate}%
                            </span>
                          </td>
                          <td className="last-active">{formatTime(user.lastActivity)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="no-data">No user data available yet</p>
              )}
            </div>
          )}

          {/* Products Tab */}
          {activeTab === 'products' && (
            <div className="products-tab">
              <h3>📦 Product Performance</h3>
              <div className="products-grid">
                {products.map((product) => {
                  const stockBadge = getStockStatusBadge(product.stockStatus);
                  return (
                    <div key={product.sku} className="product-card-admin">
                      <div className="product-header">
                        <h4>{product.name}</h4>
                        <span 
                          className="stock-status-badge"
                          style={{ backgroundColor: stockBadge.color }}
                        >
                          {stockBadge.label}
                        </span>
                      </div>
                      <p className="sku">SKU: {product.sku}</p>
                      <div className="product-stats">
                        <div className="stat">
                          <span className="label">Price</span>
                          <span className="value">${product.price.toFixed(2)}</span>
                        </div>
                        <div className="stat">
                          <span className="label">Available</span>
                          <span className="value">{product.availableQuantity}</span>
                        </div>
                        <div className="stat">
                          <span className="label">Reserved</span>
                          <span className="value">{product.reservedQuantity}</span>
                        </div>
                        <div className="stat">
                          <span className="label">Confirmed</span>
                          <span className="value success">{product.confirmedOrders}</span>
                        </div>
                        <div className="stat">
                          <span className="label">Conv. Rate</span>
                          <span className={`value ${parseFloat(product.conversionRate) >= 50 ? 'success' : ''}`}>
                            {product.conversionRate}%
                          </span>
                        </div>
                      </div>
                      <div className="stock-bar">
                        <div 
                          className="stock-fill available"
                          style={{ width: `${product.totalQuantity > 0 ? (product.availableQuantity / product.totalQuantity) * 100 : 0}%` }}
                        ></div>
                        <div 
                          className="stock-fill reserved"
                          style={{ width: `${product.totalQuantity > 0 ? (product.reservedQuantity / product.totalQuantity) * 100 : 0}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Activity Tab */}
          {activeTab === 'activity' && (
            <div className="activity-tab">
              <h3>📋 Recent Activity</h3>
              {activity.length > 0 ? (
                <div className="activity-feed">
                  {activity.map((item) => (
                    <div key={item.reservationId} className="activity-item">
                      <div 
                        className="activity-status"
                        style={{ backgroundColor: getStatusColor(item.status) }}
                      >
                        {item.status === 'confirmed' && '✓'}
                        {item.status === 'cancelled' && '✕'}
                        {item.status === 'expired' && '⏰'}
                        {item.status === 'active' && '●'}
                      </div>
                      <div className="activity-details">
                        <p className="activity-main">
                          <strong>{item.userId}</strong> {item.status} reservation for{' '}
                          <strong>{item.productName}</strong> (x{item.quantity})
                        </p>
                        <p className="activity-meta">
                          {formatTime(item.updatedAt)} • {item.reservationId.slice(0, 8)}...
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-data">No activity yet</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
