const Inventory = require('../models/Inventory');

/**
 * Seed initial inventory data
 */
const seedInventory = async () => {
  try {
    // Check if data already exists
    const count = await Inventory.countDocuments();
    if (count > 0) {
      console.log('📦 Inventory already seeded');
      return;
    }

    const products = [
      {
        sku: 'IPHONE15-PRO',
        name: 'iPhone 15 Pro',
        description: 'Latest Apple iPhone with A17 Pro chip, titanium design',
        price: 999.99,
        totalQuantity: 10,
        availableQuantity: 10,
        reservedQuantity: 0,
        imageUrl: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=400'
      },
      {
        sku: 'MACBOOK-M3',
        name: 'MacBook Pro M3',
        description: '14-inch MacBook Pro with M3 chip, 16GB RAM',
        price: 1599.99,
        totalQuantity: 5,
        availableQuantity: 5,
        reservedQuantity: 0,
        imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400'
      },
      {
        sku: 'AIRPODS-PRO2',
        name: 'AirPods Pro 2',
        description: 'Active noise cancellation, spatial audio, MagSafe charging',
        price: 249.99,
        totalQuantity: 25,
        availableQuantity: 25,
        reservedQuantity: 0,
        imageUrl: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=400'
      },
      {
        sku: 'PS5-CONSOLE',
        name: 'PlayStation 5',
        description: 'Next-gen gaming console with 825GB SSD',
        price: 499.99,
        totalQuantity: 3,
        availableQuantity: 3,
        reservedQuantity: 0,
        imageUrl: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=400'
      },
      {
        sku: 'NIKE-AIRMAX',
        name: 'Nike Air Max 90',
        description: 'Classic sneakers with Air cushioning',
        price: 129.99,
        totalQuantity: 50,
        availableQuantity: 50,
        reservedQuantity: 0,
        imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400'
      },
      {
        sku: 'SAMSUNG-TV65',
        name: 'Samsung 65" OLED TV',
        description: '4K Smart TV with Quantum HDR',
        price: 1299.99,
        totalQuantity: 8,
        availableQuantity: 8,
        reservedQuantity: 0,
        imageUrl: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400'
      },
      {
        sku: 'DYSON-V15',
        name: 'Dyson V15 Detect',
        description: 'Cordless vacuum with laser dust detection',
        price: 749.99,
        totalQuantity: 12,
        availableQuantity: 12,
        reservedQuantity: 0,
        imageUrl: 'https://images.unsplash.com/photo-1558317374-067fb5f30001?w=400'
      },
      {
        sku: 'SWITCH-OLED',
        name: 'Nintendo Switch OLED',
        description: '7-inch OLED screen, enhanced audio',
        price: 349.99,
        totalQuantity: 2,
        availableQuantity: 2,
        reservedQuantity: 0,
        imageUrl: 'https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?w=400'
      }
    ];

    await Inventory.insertMany(products);
    console.log('✅ Inventory seeded successfully');
  } catch (error) {
    console.error('❌ Error seeding inventory:', error.message);
  }
};

module.exports = seedInventory;
