require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const inventoryRoutes = require('./routes/inventoryRoutes');
const checkoutRoutes = require('./routes/checkoutRoutes');
const adminRoutes = require('./routes/adminRoutes');
const errorHandler = require('./middleware/errorHandler');
const reservationCleanup = require('./utils/reservationCleanup');
const seedInventory = require('./seeds/inventorySeed');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/inventory', inventoryRoutes);
app.use('/checkout', checkoutRoutes);
app.use('/admin', adminRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// API documentation endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Smart Inventory Reservation System API',
    version: '1.0.0',
    endpoints: {
      inventory: {
        'GET /inventory': 'Get all inventory items',
        'GET /inventory/:sku': 'Get inventory item by SKU',
        'POST /inventory': 'Create new inventory item',
        'POST /inventory/reserve': 'Reserve inventory for checkout'
      },
      checkout: {
        'POST /checkout/confirm': 'Confirm checkout and finalize purchase',
        'POST /checkout/cancel': 'Cancel checkout and release reservation',
        'GET /checkout/status/:reservationId': 'Get reservation status',
        'POST /checkout/cleanup': 'Cleanup expired reservations (admin)'
      },
      health: {
        'GET /health': 'Health check endpoint'
      }
    }
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Seed initial inventory data
    await seedInventory();

    // Start reservation cleanup scheduler
    reservationCleanup.start();

    // Start Express server
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`API Documentation: http://localhost:${PORT}/`);
    });
  } catch (error) {
    console.error(' Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();

module.exports = app;
