# 🛒 Smart Inventory Reservation System

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![MongoDB](https://img.shields.io/badge/mongodb-%3E%3D6.0-green.svg)
![React](https://img.shields.io/badge/react-18.x-61dafb.svg)

**A production-ready, scalable inventory reservation system designed for high-concurrency e-commerce platforms**

[Features](#-key-features) • [Architecture](#-system-architecture) • [Tech Stack](#-tech-stack--justification) • [Setup](#-getting-started) • [API Docs](#-api-documentation)

</div>

---

## 📋 Table of Contents

1. [Problem Statement](#-problem-statement)
2. [Our Solution](#-our-solution)
3. [Key Features](#-key-features)
4. [System Architecture](#-system-architecture)
5. [Tech Stack & Justification](#-tech-stack--justification)
6. [Code Flow & Data Journey](#-code-flow--data-journey)
7. [Design Patterns & Principles](#-design-patterns--principles)
8. [Concurrency Handling](#-concurrency-handling)
9. [TTL-Based Reservation Expiry](#-ttl-based-reservation-expiry)
10. [Idempotency Implementation](#-idempotency-implementation)
11. [API Documentation](#-api-documentation)
12. [Database Schema Design](#-database-schema-design)
13. [Error Handling Strategy](#-error-handling-strategy)
14. [Testing Strategy](#-testing-strategy)
15. [Scalability Considerations](#-scalability-considerations)
16. [Getting Started](#-getting-started)
17. [Future Enhancements](#-future-enhancements)

---

## 🎯 Problem Statement

### The Challenge

In modern e-commerce platforms, **inventory management during checkout** presents several critical challenges:

1. **Race Conditions**: Multiple users attempting to purchase the same limited-stock item simultaneously
2. **Cart Abandonment**: Reserved inventory stuck in limbo when users abandon their carts
3. **Overselling**: Selling more items than actually available in stock
4. **Poor User Experience**: Users adding items to cart only to find them unavailable at checkout
5. **Inventory Deadlocks**: Manual reservation systems failing to release inventory properly

### Real-World Scenario

Imagine a flash sale with 100 units of a popular item:
- 500 users add the item to their cart simultaneously
- Without proper reservation, all 500 see "In Stock"
- At checkout, 400 users face disappointment
- This leads to lost trust, negative reviews, and customer churn

---

## 💡 Our Solution

We've built a **Smart Inventory Reservation System** that solves these challenges through:

### Core Principles

```
┌─────────────────────────────────────────────────────────────────┐
│                    RESERVATION-BASED MODEL                       │
├─────────────────────────────────────────────────────────────────┤
│  1. RESERVE → User intent captured, inventory locked            │
│  2. CONFIRM → Purchase complete, inventory permanently reduced   │
│  3. CANCEL  → User changed mind, inventory released             │
│  4. EXPIRE  → Auto-release after TTL, inventory restored        │
└─────────────────────────────────────────────────────────────────┘
```

### How It Works

```
User Journey:
─────────────────────────────────────────────────────────────────

[Browse] → [Add to Cart] → [RESERVE API] → [5 min timer starts]
                                ↓
                    ┌───────────┴───────────┐
                    ↓                       ↓
              [Checkout]              [Abandon Cart]
                    ↓                       ↓
            [CONFIRM API]           [Auto-Expire after 5 min]
                    ↓                       ↓
         [Inventory Reduced]      [Inventory Released]
         [Order Complete ✓]       [Available for others]
```

---

## ✨ Key Features

### 1. **Real-Time Inventory Reservation**
- Instant inventory locking when user shows purchase intent
- Prevents overselling even under high concurrency
- Atomic operations ensure data consistency

### 2. **TTL-Based Auto-Expiry (5 minutes)**
- Reservations automatically expire after configurable timeout
- Prevents inventory hoarding
- Self-healing system - no manual intervention needed

### 3. **Idempotent Operations**
- Same request produces same result (no duplicates)
- Safe to retry failed requests
- Prevents double-charging and double-reserving

### 4. **Concurrent Request Handling**
- MongoDB atomic operations for thread safety
- Optimistic locking with version control
- Race condition prevention at database level

### 5. **Graceful Error Handling**
- Comprehensive error codes and messages
- Automatic rollback on failures
- Detailed logging for debugging

### 6. **Real-Time UI Updates**
- Live countdown timers showing reservation expiry
- Instant feedback on reservation status
- Toast notifications for all state changes

---

## 🏗 System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                     React.js Frontend                            │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐│   │
│  │  │  Product │  │ Checkout │  │   Cart   │  │  Countdown Timer ││   │
│  │  │   Card   │  │  Modal   │  │  State   │  │     Component    ││   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘│   │
│  └─────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │ HTTP/REST
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                              API LAYER                                   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                     Express.js Server                            │   │
│  │  ┌──────────────────────────────────────────────────────────┐  │   │
│  │  │                      Middleware                           │  │   │
│  │  │  [CORS] → [JSON Parser] → [Logger] → [Error Handler]     │  │   │
│  │  └──────────────────────────────────────────────────────────┘  │   │
│  │  ┌─────────────────┐  ┌─────────────────┐                      │   │
│  │  │ Inventory Routes│  │ Checkout Routes │                      │   │
│  │  └────────┬────────┘  └────────┬────────┘                      │   │
│  └───────────┼────────────────────┼─────────────────────────────────┘   │
└──────────────┼────────────────────┼─────────────────────────────────────┘
               │                    │
               ▼                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           BUSINESS LAYER                                 │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      Controllers                                 │   │
│  │  ┌───────────────────────┐  ┌───────────────────────┐          │   │
│  │  │ InventoryController   │  │  CheckoutController   │          │   │
│  │  │  - getInventory()     │  │  - confirmCheckout()  │          │   │
│  │  │  - reserveInventory() │  │  - cancelCheckout()   │          │   │
│  │  └───────────┬───────────┘  └───────────┬───────────┘          │   │
│  └──────────────┼──────────────────────────┼────────────────────────┘   │
│                 ▼                          ▼                            │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                       Services                                   │   │
│  │  ┌─────────────────────────────────────────────────────────┐   │   │
│  │  │              InventoryService                            │   │   │
│  │  │  - Business logic for reservations                       │   │   │
│  │  │  - Idempotency checks                                    │   │   │
│  │  │  - TTL management                                        │   │   │
│  │  │  - Concurrent access handling                            │   │   │
│  │  └─────────────────────────┬───────────────────────────────┘   │   │
│  └────────────────────────────┼─────────────────────────────────────┘   │
└───────────────────────────────┼─────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           DATA ACCESS LAYER                              │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      Repositories                                │   │
│  │  ┌────────────────────────┐  ┌────────────────────────┐        │   │
│  │  │ InventoryRepository    │  │ ReservationRepository  │        │   │
│  │  │  - findBySku()         │  │  - findById()          │        │   │
│  │  │  - reserveQuantity()   │  │  - findByUserAndSku()  │        │   │
│  │  │  - confirmQuantity()   │  │  - create()            │        │   │
│  │  │  - releaseQuantity()   │  │  - confirm()           │        │   │
│  │  └────────────┬───────────┘  └────────────┬───────────┘        │   │
│  └───────────────┼──────────────────────────┼───────────────────────┘   │
└──────────────────┼──────────────────────────┼───────────────────────────┘
                   │                          │
                   ▼                          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           DATABASE LAYER                                 │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                       MongoDB                                    │   │
│  │  ┌────────────────────────┐  ┌────────────────────────┐        │   │
│  │  │   Inventory Collection │  │ Reservations Collection │        │   │
│  │  │   - sku (unique index) │  │ - reservationId (index)│        │   │
│  │  │   - availableQuantity  │  │ - expiresAt (TTL index)│        │   │
│  │  │   - reservedQuantity   │  │ - status               │        │   │
│  │  └────────────────────────┘  └────────────────────────┘        │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### Layered Architecture Benefits

| Layer | Responsibility | Benefit |
|-------|---------------|---------|
| **Routes** | HTTP endpoint definitions | Clean URL structure, easy to modify |
| **Controllers** | Request/Response handling | Input validation, response formatting |
| **Services** | Business logic | Reusable, testable business rules |
| **Repositories** | Data access | Database abstraction, easy to swap DBs |
| **Models** | Data structure | Schema validation, type safety |

---

## 🛠 Tech Stack & Justification

### Backend

| Technology | Version | Why We Chose It |
|------------|---------|-----------------|
| **Node.js** | 18+ | Non-blocking I/O perfect for handling concurrent requests. Event-driven architecture handles thousands of simultaneous reservations efficiently. |
| **Express.js** | 4.x | Minimal, flexible framework. Easy middleware integration for logging, CORS, error handling. |
| **MongoDB** | 6.x | Document-based storage ideal for flexible inventory schemas. Native support for TTL indexes enables automatic reservation expiry. Atomic operations prevent race conditions. |
| **Mongoose** | 8.x | Schema validation, middleware hooks, and elegant query building. Built-in support for timestamps and indexing. |

### Frontend

| Technology | Version | Why We Chose It |
|------------|---------|-----------------|
| **React.js** | 18.x | Component-based architecture for reusable UI elements. Virtual DOM for efficient re-renders during countdown updates. |
| **Axios** | 1.x | Promise-based HTTP client with interceptors for error handling and request/response transformation. |
| **React Toastify** | 9.x | Beautiful notifications for reservation status updates. |
| **UUID** | 9.x | Client-side unique ID generation for idempotency keys. |

### Why MERN Stack?

```
┌────────────────────────────────────────────────────────────────┐
│                    MERN STACK ADVANTAGES                        │
├────────────────────────────────────────────────────────────────┤
│  ✓ JavaScript everywhere - reduced context switching           │
│  ✓ JSON native - no data transformation between layers         │
│  ✓ Non-blocking I/O - handles high concurrency naturally       │
│  ✓ Rich ecosystem - npm packages for every need                │
│  ✓ Real-time capable - easy WebSocket integration if needed    │
│  ✓ Scalable - horizontal scaling with load balancers           │
│  ✓ Developer productivity - rapid prototyping and iteration    │
└────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Code Flow & Data Journey

### Complete Request Lifecycle

#### 1. Reserve Inventory Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        RESERVE INVENTORY FLOW                             │
└──────────────────────────────────────────────────────────────────────────┘

Frontend (React)                    Backend (Express + MongoDB)
─────────────────                   ──────────────────────────

[User clicks "Reserve"]
        │
        ▼
┌─────────────────┐
│ ProductCard.jsx │
│ handleReserve() │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    api.js       │
│ reserveItem()   │─────────────────▶  POST /inventory/reserve
└─────────────────┘                    { sku, quantity, userId }
                                                │
                                                ▼
                                    ┌─────────────────────────┐
                                    │   inventoryRoutes.js    │
                                    │   router.post('/reserve')│ // routes
                                    └────────────┬────────────┘
                                                 │
                                                 ▼
                                    ┌─────────────────────────┐
                                    │ inventoryController.js  │
                                    │   reserveInventory()    │
                                    │   - Validate input      │//   controller
                                    │   - Parse quantity      │
                                    └────────────┬────────────┘
                                                 │
                                                 ▼
                                    ┌─────────────────────────┐
                                    │  inventoryService.js    │
                                    │   reserveInventory()    │
                                    │   - Check existing res. │//services
                                    │   - Verify stock        │
                                    │   - Calculate expiry    │
                                    └────────────┬────────────┘
                                                 │
                              ┌──────────────────┼──────────────────┐
                              ▼                  ▼                  ▼
               ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
               │inventoryRepo.js  │  │reservationRepo.js│  │    MongoDB       │
               │reserveQuantity() │  │    create()      │  │ Atomic Update    │
               │ $inc: available  │  │ Insert document  │  │ with $inc        │
//repositoires │ $inc: reserved   │  │ Set TTL index    │  │                  │//models/mongoDB
               └──────────────────┘  └──────────────────┘  └──────────────────┘
                                                 │
                                                 ▼
                                    ┌─────────────────────────┐
                                    │      Response           │
                                    │  { reservationId,       │
                                    │    sku, quantity,       │
                                    │    expiresAt }          │
                                    └────────────┬────────────┘
                                                 │
         ┌───────────────────────────────────────┘
         ▼
┌─────────────────┐
│ Update UI State │
│ - Show modal    │
│ - Start timer   │
│ - Toast notify  │
└─────────────────┘
```

#### 2. Confirm Checkout Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        CONFIRM CHECKOUT FLOW                              │
└──────────────────────────────────────────────────────────────────────────┘

[User clicks "Confirm Purchase"]
         │
         ▼
┌─────────────────────┐
│  CheckoutModal.jsx  │
│  handleConfirm()    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│      api.js         │
│  confirmCheckout()  │──────────────▶  POST /checkout/confirm
└─────────────────────┘                 { reservationId, userId }
                                                  │
                                                  ▼
                                     ┌─────────────────────────┐
                                     │  checkoutController.js  │
                                     │    confirmCheckout()    │
                                     └────────────┬────────────┘
                                                  │
                                                  ▼
                                     ┌─────────────────────────┐
                                     │   inventoryService.js   │
                                     │    confirmCheckout()    │
                                     │                         │
                                     │  1. Find reservation    │
                                     │  2. Verify ownership    │
                                     │  3. Check not expired   │
                                     │  4. Check not cancelled │
                                     │  5. Update status       │
                                     └────────────┬────────────┘
                                                  │
                              ┌────────────────────┴────────────────────┐
                              ▼                                        ▼
               ┌─────────────────────────┐              ┌─────────────────────────┐
               │  reservationRepo.js     │              │   inventoryRepo.js      │
               │  confirm(reservationId) │              │   confirmQuantity()     │
               │  status: 'confirmed'    │              │   $inc: reserved: -qty  │
               └─────────────────────────┘              │   $inc: total: -qty     │
                                                        └─────────────────────────┘
                                                  │
                                                  ▼
                                     ┌─────────────────────────┐
                                     │  Response: 200 OK       │
                                     │  { status: 'confirmed'} │
                                     └─────────────────────────┘
```

#### 3. Auto-Expiry Flow (Background Process)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                     TTL AUTO-EXPIRY MECHANISM                             │
└──────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────────────────────┐
                    │        MongoDB TTL Index            │
                    │  { expiresAt: 1, expireAfterSeconds }│
                    └──────────────────┬──────────────────┘
                                       │
         ┌─────────────────────────────┼─────────────────────────────┐
         │                             │                             │
         ▼                             ▼                             ▼
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│  Reservation 1  │         │  Reservation 2  │         │  Reservation 3  │
│  Created: 10:00 │         │  Created: 10:02 │         │  Created: 10:05 │
│  Expires: 10:05 │         │  Expires: 10:07 │         │  Expires: 10:10 │
│  Status: active │         │  Status: active │         │  Status: active │
└────────┬────────┘         └─────────────────┘         └─────────────────┘
         │
         │  [Time: 10:05 - MongoDB background task runs]
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    CLEANUP SCHEDULER (Every 60 seconds)                  │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  1. Find all reservations where:                                 │   │
│  │     - status = 'active'                                          │   │
│  │     - expiresAt < now()                                          │   │
│  │                                                                  │   │
│  │  2. For each expired reservation:                                │   │
│  │     - Update status to 'expired'                                 │   │
│  │     - Release inventory:                                         │   │
│  │       inventory.availableQuantity += reservation.quantity        │   │
│  │       inventory.reservedQuantity -= reservation.quantity         │   │
│  │                                                                  │   │//utils
│  │  3. Log cleanup results                                          │   │//reservationCleanup.js
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│  Reservation 1  │
│  Status: expired│  ──────▶  Inventory Released Back to Pool
│  [Document may  │
│   be deleted by │
│   TTL index]    │
└─────────────────┘
```

---

## 🎨 Design Patterns & Principles

### 1. Repository Pattern

```javascript
// Abstracts data access logic from business logic
class InventoryRepository {
  async findBySku(sku) { /* MongoDB query */ }
  async reserveQuantity(sku, quantity) { /* Atomic update */ }
}

// Benefits:
// ✓ Easy to swap databases (MongoDB → PostgreSQL)
// ✓ Centralized query logic
// ✓ Easier unit testing with mocks
```

### 2. Service Layer Pattern

```javascript
// Contains all business logic
class InventoryService {
  async reserveInventory(sku, userId, quantity) {
    // 1. Check idempotency
    // 2. Validate stock
    // 3. Create reservation
    // 4. Update inventory
  }
}

// Benefits:
// ✓ Reusable across different controllers
// ✓ Testable in isolation
// ✓ Single responsibility
```

### 3. Dependency Injection

```javascript
// Controllers receive services as dependencies
const inventoryController = {
  async reserve(req, res) {
    const result = await inventoryService.reserve(/*...*/);
  }
};

// Benefits:
// ✓ Loose coupling
// ✓ Easy to mock for testing
// ✓ Flexible configuration
```

### 4. Error Handling Middleware

```javascript
// Centralized error handling
const errorHandler = (err, req, res, next) => {
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: err.message
  });
};

// Benefits:
// ✓ Consistent error responses
// ✓ No try-catch in every route
// ✓ Easy to add logging/monitoring
```

---

## 🔐 Concurrency Handling

### The Problem

```
Time     User A                    User B                    Inventory
─────────────────────────────────────────────────────────────────────────
T1       Read: available = 1       Read: available = 1       available: 1
T2       Reserve 1 unit            Reserve 1 unit            
T3       Write: available = 0      Write: available = 0      available: 0
T4       SUCCESS ✓                 SUCCESS ✓                 OVERSOLD! ❌
```

### Our Solution: Atomic Operations

```javascript
// MongoDB atomic update with conditions
const result = await Inventory.findOneAndUpdate(
  { 
    sku: sku,
    availableQuantity: { $gte: quantity }  // Condition check
  },
  { 
    $inc: { 
      availableQuantity: -quantity,  // Atomic decrement
      reservedQuantity: quantity     // Atomic increment
    }
  },
  { new: true }
);

// If condition fails (not enough stock), result is null
// No race condition possible!
```

### How It Works

```
Time     User A                    User B                    MongoDB
─────────────────────────────────────────────────────────────────────────
T1       findOneAndUpdate          findOneAndUpdate          
         (available >= 1)          (available >= 1)          available: 1
         
T2       [ATOMIC: Check + Update]  [WAITING - Lock]          
         available = 0 ✓                                     available: 0

T3                                 [ATOMIC: Check + Update]
                                   available >= 1? NO!       
                                   Returns null ❌

Result:  SUCCESS                   REJECTED                  No overselling!
```

---

## ⏰ TTL-Based Reservation Expiry

### Why TTL?

| Scenario | Without TTL | With TTL |
|----------|-------------|----------|
| Cart abandonment | Inventory locked forever | Auto-released after 5 min |
| Browser crash | Manual cleanup needed | Self-healing |
| Network issues | Orphaned reservations | Automatic recovery |
| Scalability | Admin overhead | Zero maintenance |

### Implementation

```javascript
// Schema with TTL index
const reservationSchema = new Schema({
  reservationId: String,
  sku: String,
  quantity: Number,
  status: { type: String, default: 'active' },
  expiresAt: { 
    type: Date, 
    default: () => new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
    index: { expires: 0 }  // TTL Index - MongoDB auto-deletes
  }
});

// Additionally, we run a cleanup scheduler for inventory updates
const cleanupScheduler = setInterval(async () => {
  const expired = await Reservation.find({
    status: 'active',
    expiresAt: { $lt: new Date() }
  });
  
  for (const res of expired) {
    await releaseInventory(res.sku, res.quantity);
    await res.updateOne({ status: 'expired' });
  }
}, 60000); // Every minute
```

### Timeline Visualization

```
0:00          1:00          2:00          3:00          4:00          5:00
  │             │             │             │             │             │
  ▼             │             │             │             │             │
[RESERVE]       │             │             │             │             │
  │             │             │             │             │             │
  │◄───────────────── ACTIVE RESERVATION WINDOW ───────────────────────►│
  │             │             │             │             │             │
  │             │             │             │             │             ▼
  │             │             │             │             │         [EXPIRED]
  │             │             │             │             │             │
  │             │             │             │             │             ▼
  │             │             │             │             │    [Inventory Released]
  │             │             │             │             │             │
  │             │             │             │             │             ▼
  │             │             │             │             │  [Available for others]
```

---

## 🔁 Idempotency Implementation

### Why Idempotency Matters

```
Scenario: Network timeout during reservation
─────────────────────────────────────────────

[Client] ──POST /reserve──▶ [Server] ──▶ [DB: Reserved!]
                                              │
[Client] ◀──── TIMEOUT ────────────────────────┘ (Response lost)

Without Idempotency:
[Client] ──POST /reserve──▶ [Server] ──▶ [DB: Reserved AGAIN!]
Result: Double reservation! ❌

With Idempotency:
[Client] ──POST /reserve──▶ [Server] ──▶ [Check: Already reserved]
                                              │
[Client] ◀── Return existing reservation ─────┘
Result: Same reservation returned ✓
```

### Our Implementation

```javascript
async reserveInventory(sku, userId, quantity) {
  // 1. Check for existing active reservation (Idempotency Key: sku + userId)
  const existingReservation = await reservationRepository.findActiveByUserAndSku(
    userId, 
    sku
  );

  if (existingReservation) {
    // Return existing reservation - idempotent response
    return {
      ...existingReservation,
      message: 'Existing reservation found',
      isExisting: true  // Flag for client to know
    };
  }

  // 2. Create new reservation only if none exists
  const reservation = await this.createNewReservation(sku, userId, quantity);
  return reservation;
}
```

### Idempotency Matrix

| Request | First Call | Second Call (Same Params) | Result |
|---------|------------|---------------------------|--------|
| Reserve | Creates new | Returns existing | ✓ Idempotent |
| Confirm | Confirms | Returns "already confirmed" | ✓ Idempotent |
| Cancel | Cancels | Returns "already cancelled" | ✓ Idempotent |

---

## 📚 API Documentation

### Base URL
```
http://localhost:5001
```

### Endpoints

#### 1. Get All Inventory
```http
GET /inventory
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "sku": "IPHONE-15-PRO",
      "name": "iPhone 15 Pro",
      "price": 999.99,
      "availableQuantity": 50,
      "reservedQuantity": 5,
      "totalQuantity": 55
    }
  ]
}
```

#### 2. Get Inventory by SKU
```http
GET /inventory/:sku
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sku": "IPHONE-15-PRO",
    "name": "iPhone 15 Pro",
    "availableQuantity": 50,
    "reservedQuantity": 5
  }
}
```

#### 3. Reserve Inventory
```http
POST /inventory/reserve
Content-Type: application/json

{
  "sku": "IPHONE-15-PRO",
  "quantity": 1,
  "userId": "user-123"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "reservationId": "res-uuid-12345",
    "sku": "IPHONE-15-PRO",
    "quantity": 1,
    "expiresAt": "2026-01-06T12:05:00.000Z",
    "message": "Inventory reserved successfully"
  }
}
```

**Idempotent Response (200):**
```json
{
  "success": true,
  "data": {
    "reservationId": "res-uuid-12345",
    "isExisting": true,
    "message": "Existing reservation found"
  }
}
```

**Error Response (409):**
```json
{
  "success": false,
  "message": "Insufficient inventory available",
  "availableQuantity": 0,
  "requestedQuantity": 1
}
```

#### 4. Confirm Checkout
```http
POST /checkout/confirm
Content-Type: application/json

{
  "reservationId": "res-uuid-12345",
  "userId": "user-123"
}
```

**Success Response:**
```json
{
  "success": true,
  "data": {
    "reservationId": "res-uuid-12345",
    "status": "confirmed",
    "message": "Checkout confirmed successfully"
  }
}
```

#### 5. Cancel Checkout
```http
POST /checkout/cancel
Content-Type: application/json

{
  "reservationId": "res-uuid-12345",
  "userId": "user-123"
}
```

**Success Response:**
```json
{
  "success": true,
  "data": {
    "reservationId": "res-uuid-12345",
    "status": "cancelled",
    "message": "Reservation cancelled successfully"
  }
}
```

---

## 🗃 Database Schema Design

### Inventory Collection

```javascript
{
  _id: ObjectId,
  sku: String,              // Unique product identifier
  name: String,             // Product name
  description: String,      // Product description
  price: Number,            // Price in cents
  imageUrl: String,         // Product image
  totalQuantity: Number,    // Total units in warehouse
  availableQuantity: Number,// Units available for reservation
  reservedQuantity: Number, // Units currently reserved
  createdAt: Date,
  updatedAt: Date
}

// Indexes
{ sku: 1 }  // Unique index for fast lookups
```

### Reservations Collection

```javascript
{
  _id: ObjectId,
  reservationId: String,    // UUID for external reference
  sku: String,              // Product SKU
  userId: String,           // User who made reservation
  quantity: Number,         // Reserved quantity
  status: String,           // 'active' | 'confirmed' | 'cancelled' | 'expired'
  expiresAt: Date,          // TTL timestamp
  createdAt: Date,
  updatedAt: Date
}

// Indexes
{ reservationId: 1 }              // Unique index
{ sku: 1, userId: 1, status: 1 }  // Compound index for idempotency
{ expiresAt: 1 }                  // TTL index (expires: 0)
```

### Data Integrity Rules

```
┌─────────────────────────────────────────────────────────────┐
│              INVENTORY QUANTITY INVARIANT                    │
│                                                             │
│   totalQuantity = availableQuantity + reservedQuantity      │
│                                                             │
│   This MUST always be true. Any violation indicates a bug.  │
└─────────────────────────────────────────────────────────────┘

Operations:
─────────────────────────────────────────────────────────────
RESERVE:   available -= qty,  reserved += qty,  total: unchanged
CONFIRM:   available: unchanged,  reserved -= qty,  total -= qty
CANCEL:    available += qty,  reserved -= qty,  total: unchanged
EXPIRE:    available += qty,  reserved -= qty,  total: unchanged
```

---

## ⚠️ Error Handling Strategy

### HTTP Status Codes

| Code | Meaning | When Used |
|------|---------|-----------|
| 200 | OK | Successful GET, idempotent operations |
| 201 | Created | New reservation created |
| 400 | Bad Request | Missing/invalid parameters |
| 403 | Forbidden | Reservation belongs to another user |
| 404 | Not Found | SKU or reservation doesn't exist |
| 409 | Conflict | Insufficient stock, already confirmed/cancelled |
| 410 | Gone | Reservation expired |
| 500 | Server Error | Unexpected errors |

### Error Response Format

```javascript
{
  "success": false,
  "message": "Human readable error message",
  "code": "ERROR_CODE",          // For client-side handling
  "details": { /* additional context */ }
}
```

### Error Handling Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                     ERROR HANDLING MIDDLEWARE                        │
└─────────────────────────────────────────────────────────────────────┘

[Request] ──▶ [Controller] ──▶ [Service] ──▶ [Repository]
                  │               │               │
                  │               │               ▼
                  │               │         [DB Error?]
                  │               │               │
                  │               ▼               │
                  │        [Business Error?] ◀────┘
                  │               │
                  ▼               │
            [Validation Error?] ◀─┘
                  │
                  ▼
         [Error Handler Middleware]
                  │
                  ▼
         ┌───────────────────┐
         │  Formatted Error  │
         │  Response JSON    │
         └───────────────────┘
```

---

## 🧪 Testing Strategy

### Test Categories

```
┌─────────────────────────────────────────────────────────────┐
│                    TEST PYRAMID                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                        /\                                   │
│                       /  \         E2E Tests (Few)          │
│                      /────\        - Full workflows         │
│                     /      \                                │
│                    /────────\      Integration Tests        │
│                   /          \     - API endpoints          │
│                  /────────────\    - DB operations          │
│                 /              \                            │
│                /────────────────\  Unit Tests (Many)        │
│               /                  \ - Services               │
│              /____________________\- Repositories           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Running Tests

```bash
# Run all API tests
cd server
node tests/api.test.js
```

### Test Coverage

| Test Suite | Tests | Coverage |
|------------|-------|----------|
| Health Check | 1 | Server availability |
| Inventory GET | 3 | Read operations |
| Reservation | 5 | Reserve flow |
| Checkout Confirm | 4 | Confirm flow |
| Checkout Cancel | 5 | Cancel flow |
| Concurrency | 1 | Race conditions |
| Idempotency | 1 | Duplicate requests |
| Validation | 3 | Input validation |
| Full Workflow | 2 | End-to-end flows |

**Total: 25 tests | 100% Pass Rate**

---

## 📈 Scalability Considerations

### Current Architecture Scalability

```
┌─────────────────────────────────────────────────────────────────────┐
│                   HORIZONTAL SCALING READY                           │
└─────────────────────────────────────────────────────────────────────┘

                        ┌─────────────┐
                        │   Nginx     │
                        │   (LB)      │
                        └──────┬──────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
       ┌────────────┐   ┌────────────┐   ┌────────────┐
       │  Node.js   │   │  Node.js   │   │  Node.js   │
       │ Instance 1 │   │ Instance 2 │   │ Instance 3 │
       └──────┬─────┘   └──────┬─────┘   └──────┬─────┘
              │                │                │
              └────────────────┼────────────────┘
                               │
                        ┌──────▼──────┐
                        │   MongoDB   │
                        │  (Replica   │
                        │    Set)     │
                        └─────────────┘
```

### Scalability Features

| Feature | Implementation | Benefit |
|---------|---------------|---------|
| Stateless API | No session storage | Any instance can handle any request |
| Atomic DB ops | MongoDB $inc | No distributed locks needed |
| Connection pooling | Mongoose default | Efficient DB connections |
| TTL cleanup | MongoDB native | No cron jobs per instance |

### Future Scaling Options

1. **Redis Caching**: Cache inventory reads
2. **MongoDB Sharding**: Distribute data across clusters
3. **Message Queue**: Decouple reservation processing
4. **CDN**: Cache static assets

---

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18.0.0
- MongoDB >= 6.0
- npm >= 9.0

### Installation

```bash
# Clone repository
git clone <repository-url>
cd flexyPeHackathon

# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

### Configuration

Create `server/.env`:
```env
PORT=5001
MONGODB_URI=mongodb://localhost:27017/inventory_reservation
RESERVATION_TTL_MINUTES=5
```

### Running the Application

```bash
# Terminal 1: Start MongoDB (if not running)
mongod

# Terminal 2: Start backend
cd server
node server.js

# Terminal 3: Start frontend
cd client
npm start
```

### Access Points

| Service | URL |
|---------|-----|
| Backend API | http://localhost:5001 |
| Frontend | http://localhost:3000 |
| API Docs | http://localhost:5001/ |
| Health Check | http://localhost:5001/health |

---

## 🔮 Future Enhancements

### Phase 2 Roadmap

| Feature | Description | Priority |
|---------|-------------|----------|
| WebSocket | Real-time inventory updates | High |
| Redis Cache | Faster inventory reads | High |
| Rate Limiting | Prevent abuse | Medium |
| Analytics Dashboard | Reservation metrics | Medium |
| Multi-warehouse | Distributed inventory | Low |
| Batch Operations | Bulk reservations | Low |

### Potential Improvements

```
┌─────────────────────────────────────────────────────────────┐
│                    ENHANCEMENT IDEAS                         │
├─────────────────────────────────────────────────────────────┤
│  ✓ WebSocket for real-time stock updates                    │
│  ✓ Redis for caching hot inventory items                    │
│  ✓ Elasticsearch for inventory search                       │
│  ✓ Kubernetes for container orchestration                   │
│  ✓ Prometheus + Grafana for monitoring                      │
│  ✓ OpenTelemetry for distributed tracing                    │
│  ✓ Circuit breaker pattern for resilience                   │
│  ✓ Event sourcing for audit trail                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
flexyPeHackathon/
├── server/                          # Backend (Node.js + Express)
│   ├── config/
│   │   └── database.js              # MongoDB connection
│   ├── controllers/
│   │   ├── inventoryController.js   # Inventory HTTP handlers
│   │   └── checkoutController.js    # Checkout HTTP handlers
│   ├── middleware/
│   │   └── errorHandler.js          # Centralized error handling
│   ├── models/
│   │   ├── Inventory.js             # Inventory Mongoose schema
│   │   └── Reservation.js           # Reservation Mongoose schema
│   ├── repositories/
│   │   ├── inventoryRepository.js   # Inventory data access
│   │   └── reservationRepository.js # Reservation data access
│   ├── routes/
│   │   ├── inventoryRoutes.js       # /inventory endpoints
│   │   └── checkoutRoutes.js        # /checkout endpoints
│   ├── services/
│   │   └── inventoryService.js      # Business logic
│   ├── seeds/
│   │   └── inventorySeed.js         # Sample data seeder
│   ├── utils/
│   │   └── reservationCleanup.js    # TTL cleanup scheduler
│   ├── tests/
│   │   └── api.test.js              # API test suite
│   ├── server.js                    # Entry point
│   ├── package.json
│   └── .env
│
├── client/                          # Frontend (React)
│   ├── src/
│   │   ├── components/
│   │   │   ├── ProductCard.jsx      # Product display + reserve
│   │   │   └── CheckoutModal.jsx    # Checkout UI
│   │   ├── hooks/
│   │   │   └── useCountdown.js      # Timer hook
│   │   ├── services/
│   │   │   └── api.js               # API client
│   │   ├── App.js
│   │   ├── App.css
│   │   └── index.js
│   └── package.json
│
└── README.md                        # This file
```

---

## 📄 License

MIT License - feel free to use this project as a reference or starting point.

---

## 👥 Team

Built with ❤️ for the Hackathon

---

<div align="center">

**⭐ If you found this helpful, please star the repository! ⭐**

Made with passion for solving real e-commerce challenges

</div>
