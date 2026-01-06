const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  sku: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  totalQuantity: {
    type: Number,
    required: true,
    min: 0
  },
  availableQuantity: {
    type: Number,
    required: true,
    min: 0
  },
  reservedQuantity: {
    type: Number,
    default: 0,
    min: 0
  },
  imageUrl: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Virtual to check if item is in stock
inventorySchema.virtual('inStock').get(function() {
  return this.availableQuantity > 0;
});

// Ensure availableQuantity never goes negative
inventorySchema.pre('save', function(next) {
  if (this.availableQuantity < 0) {
    this.availableQuantity = 0;
  }
  if (this.reservedQuantity < 0) {
    this.reservedQuantity = 0;
  }
  next();
});

module.exports = mongoose.model('Inventory', inventorySchema);
