# ShopMind Architecture Documentation

## 📐 System Architecture Overview

ShopMind follows a **microservices architecture pattern** with independent, deployable backend services and a modern frontend application. This document provides detailed insights into the system design, component interactions, and deployment strategies.

## 🏛️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND LAYER                         │
│           React 19 + Vite (Port: 5173/3000)                 │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Customer    │  │    Seller    │  │  Dashboard   │      │
│  │   Portal     │  │    Portal    │  │   (Future)   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                           ↓ HTTP/REST
┌─────────────────────────────────────────────────────────────┐
│                    API GATEWAY LAYER                        │
│              (Port: 8080) - Request Router                  │
│                                                             │
│         ┌─────────────────────────────────────┐             │
│         │  • Request Routing                  │             │
│         │  • Load Balancing                   │             │
│         │  • Rate Limiting                    │             │
│         │  • CORS Handling                    │             │
│         └─────────────────────────────────────┘             │
└─────────────────────────────────────────────────────────────┘
     ↙         ↙         ↙         ↙         ↙
┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
│  AUTH   │ │  CART   │ │ PRODUCT │ │INVENTORY│
│SERVICE  │ │SERVICE  │ │ SERVICE │ │SERVICE  │
│(8081)   │ │(8082)   │ │         │ │(8083)   │
└─────────┘ └─────────┘ └─────────┘ └─────────┘
     ↓         ↓         ↓         ↓
┌─────────────────────────────────────────────┐
│            DATABASE LAYER                   │
│         MySQL (Shared/Per-Service)          │
│                                             │
│  ┌────────┐ ┌────────┐ ┌────────┐         │
│  │  Auth  │ │  Cart  │ │Products│         │
│  │   DB   │ │   DB   │ │   DB   │         │
│  └────────┘ └────────┘ └────────┘         │
└─────────────────────────────────────────────┘
```

## 🔧 Microservices Architecture

### 1. **API Gateway Service**
**Port**: 8080  
**Purpose**: Central entry point for all client requests

#### Responsibilities:
- Route requests to appropriate microservices
- Handle authentication/authorization
- Load balancing across service instances
- Rate limiting and throttling
- Request/Response transformation
- CORS configuration

#### Tech Stack:
- Spring Boot 4.1.0
- Java 21
- Spring Cloud Gateway (optional)

#### Endpoints:
```
GET  /api/health           → Health check
POST /api/auth/login       → Auth-Service
POST /api/auth/register    → Auth-Service
GET  /api/products         → Product-Service
POST /api/cart/add         → Cart-Service
GET  /api/inventory        → Inventory-Service
```

---

### 2. **Authentication Service**
**Port**: 8081  
**Purpose**: User authentication, JWT token generation, authorization

#### Responsibilities:
- User registration and login
- Password hashing and validation
- JWT token generation and validation
- Role-based access control (RBAC)
- Session management

#### Key Entities:
```java
User {
  id: UUID
  email: String
  passwordHash: String
  role: CUSTOMER | SELLER | ADMIN
  createdAt: DateTime
  updatedAt: DateTime
}

Token {
  userId: UUID
  token: String
  expiresAt: DateTime
}
```

#### API Endpoints:
```
POST   /auth/register      → Register new user
POST   /auth/login         → Authenticate user
POST   /auth/refresh       → Refresh JWT token
GET    /auth/verify        → Verify token
POST   /auth/logout        → Logout user
GET    /auth/profile       → Get user profile
```

---

### 3. **Cart Service**
**Port**: 8082  
**Purpose**: Shopping cart management

#### Responsibilities:
- Add/remove items from cart
- Update item quantities
- Calculate subtotals and totals
- Apply discounts and coupons
- Manage cart state (active, abandoned, converted)

#### Key Entities:
```java
Cart {
  id: UUID
  userId: UUID
  items: List<CartItem>
  status: ACTIVE | ABANDONED | CONVERTED
  subtotal: BigDecimal
  tax: BigDecimal
  discount: BigDecimal
  total: BigDecimal
  createdAt: DateTime
  updatedAt: DateTime
}

CartItem {
  id: UUID
  cartId: UUID
  productId: UUID
  quantity: Integer
  price: BigDecimal
  addedAt: DateTime
}
```

#### API Endpoints:
```
POST   /cart/add           → Add item to cart
DELETE /cart/remove/:id    → Remove item from cart
PUT    /cart/update/:id    → Update item quantity
GET    /cart               → Get current cart
DELETE /cart/clear         → Clear cart
```

---

### 4. **Inventory Service**
**Port**: 8083  
**Purpose**: Product stock management and availability

#### Responsibilities:
- Track product inventory levels
- Handle stock reservations
- Update inventory on order completion
- Generate low-stock alerts
- Support multiple warehouses (future)

#### Key Entities:
```java
Inventory {
  id: UUID
  productId: UUID
  quantity: Integer
  reserved: Integer
  available: Integer (quantity - reserved)
  lastRestockDate: DateTime
  reorderLevel: Integer
}

StockMovement {
  id: UUID
  inventoryId: UUID
  type: INBOUND | OUTBOUND | RETURN
  quantity: Integer
  reason: String
  timestamp: DateTime
}
```

#### API Endpoints:
```
GET    /inventory/:productId       → Get stock level
POST   /inventory/reserve/:id      → Reserve stock
POST   /inventory/release/:id      → Release reservation
PUT    /inventory/update/:id       → Update inventory
GET    /inventory/low-stock        → Get low stock items
```

---

### 5. **Frontend - React Application**
**Port**: 5173 (dev) / 3000 (prod)  
**Purpose**: User interface for customers and sellers

#### Structure:
```
Frontend/AI-Ecommerce-Platform/
├── src/
│   ├── api/                 # API client functions
│   │   ├── apiClient.js     # Axios instance
│   │   ├── authApi.js
│   │   ├── cartApi.js
│   │   ├── productApi.js
│   │   └── orderApi.js
│   ├── components/          # React components
│   │   ├── common/          # Shared components
│   │   │   ├── Button.jsx
│   │   │   ├── Loader.jsx
│   │   │   └── Modal.jsx
│   │   ├── Customer/        # Customer portal
│   │   │   ├── Storefront.jsx
│   │   │   ├── ProductDetail.jsx
│   │   │   ├── CartDrawer.jsx
│   │   │   └── CheckoutModal.jsx
│   │   └── Seller/          # Seller portal
│   │       ├── SellerApp.jsx
│   │       ├── ProductList.jsx
│   │       └── SellerOrders.jsx
│   ├── styles/              # CSS modules
│   ├── App.jsx              # Main component
│   └── main.jsx             # Entry point
└── vite.config.js           # Vite configuration
```

#### Key Features:
- **Customer Portal**: Browse products, add to cart, checkout
- **Seller Portal**: Manage product listings, view orders
- **AI Recommendations**: Personalized product suggestions
- **Payment Integration**: Razorpay checkout flow
- **Order Management**: Track orders and view history

---

## 📊 Data Flow Architecture

### 1. **User Registration Flow**
```
Frontend (Register Form)
    ↓
API Gateway (/api/auth/register)
    ↓
Auth Service (Create User)
    ↓
Database (User Table)
    ↓
Response (User ID + Success)
```

### 2. **Product Browsing Flow**
```
Frontend (Product List)
    ↓
API Gateway (/api/products)
    ↓
Product Service (Fetch Products)
    ↓
Inventory Service (Check Stock)
    ↓
Database (Product + Inventory)
    ↓
Response (Products with Stock Info)
```

### 3. **Shopping Cart Flow**
```
Frontend (Add to Cart)
    ↓
API Gateway (/api/cart/add)
    ↓
Cart Service (Add Item)
    ↓
Inventory Service (Reserve Stock)
    ↓
Database (Update Cart & Inventory)
    ↓
Response (Updated Cart)
```

### 4. **Checkout & Payment Flow**
```
Frontend (Checkout Button)
    ↓
Razorpay Integration (Create Order)
    ↓
Payment Gateway (Process Payment)
    ↓
Payment Service (Record Transaction)
    ↓
Order Service (Create Order) [Future]
    ↓
Inventory Service (Confirm Reservation)
    ↓
Cart Service (Clear/Convert Cart)
    ↓
Response (Order Confirmation)
```

---

## 🔐 Security Architecture

### Authentication & Authorization

```
┌─────────────────────────────────────────┐
│        Client (Frontend)                │
│  Stores JWT in LocalStorage             │
└─────────────────────────────────────────┘
            ↓ Sends JWT in Header
┌─────────────────────────────────────────┐
│      API Gateway                        │
│  • Extracts JWT from header             │
│  • Validates signature & expiry         │
│  • Passes to Auth Service               │
└─────────────────────────────────────────┘
            ↓
┌─────────────────────────────────────────┐
│      Auth Service                       │
│  • Validates token claims               │
│  • Checks user permissions              │
│  • Returns user context                 │
└─────────────────────────────────────────┘
            ↓
┌─────────────────────────────────────────┐
│      Protected Resource                 │
│  (Only accessed if token is valid)      │
└─────────────────────────────────────────┘
```

### Security Features:
- **JWT Token-based Authentication**: Stateless, scalable
- **CORS Configuration**: Restricts cross-origin requests
- **HTTPS (Production)**: Encrypted communication
- **Password Hashing**: BCrypt for secure storage
- **Rate Limiting**: Prevent brute force attacks
- **Input Validation**: Sanitize all user inputs
- **Role-Based Access Control**: CUSTOMER, SELLER, ADMIN roles

---

## 🌐 Database Architecture

### Database Design Pattern
**Option 1: Shared Database** (Current)
```
Single MySQL Database
├── Auth Tables
│   ├── users
│   ├── roles
│   └── permissions
├── Cart Tables
│   ├── carts
│   └── cart_items
├── Product Tables
│   ├── products
│   ├── categories
│   └── reviews
└── Inventory Tables
    ├── inventory
    └── stock_movements
```

### Option 2: Polyglot Persistence (Future)
```
Auth Service → PostgreSQL (user security)
Cart Service → Redis (high-speed access)
Product Service → MongoDB (flexible schema)
Inventory Service → MySQL (relational data)
```

### Database Relationships

```
users (1) ──→ (M) carts
users (1) ──→ (M) orders
products (1) ──→ (M) cart_items
products (1) ──→ (M) inventory
products (1) ──→ (M) reviews
```

### Schema Overview

```sql
-- Users Table
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255),
  role ENUM('CUSTOMER', 'SELLER', 'ADMIN'),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products Table
CREATE TABLE products (
  id UUID PRIMARY KEY,
  seller_id UUID FOREIGN KEY,
  name VARCHAR(255),
  description TEXT,
  price DECIMAL(10, 2),
  category VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inventory Table
CREATE TABLE inventory (
  id UUID PRIMARY KEY,
  product_id UUID FOREIGN KEY UNIQUE,
  quantity INT,
  reserved INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Carts Table
CREATE TABLE carts (
  id UUID PRIMARY KEY,
  user_id UUID FOREIGN KEY,
  status ENUM('ACTIVE', 'ABANDONED', 'CONVERTED'),
  subtotal DECIMAL(10, 2),
  tax DECIMAL(10, 2),
  discount DECIMAL(10, 2),
  total DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cart Items Table
CREATE TABLE cart_items (
  id UUID PRIMARY KEY,
  cart_id UUID FOREIGN KEY,
  product_id UUID FOREIGN KEY,
  quantity INT,
  price DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🚀 Deployment Architecture

### Docker Compose Deployment

```yaml
version: '3.8'
services:
  mysql:
    image: mysql:8.0
    ports: [3306:3306]
    volumes: [db_data:/var/lib/mysql]

  api-gateway:
    image: api-gateway:latest
    ports: [8080:8080]
    depends_on: [mysql]

  auth-service:
    image: auth-service:latest
    ports: [8081:8081]
    depends_on: [mysql]

  cart-service:
    image: cart-service:latest
    ports: [8082:8082]
    depends_on: [mysql]

  inventory-service:
    image: inventory-service:latest
    ports: [8083:8083]
    depends_on: [mysql]

  frontend:
    image: frontend:latest
    ports: [3000:80]
    depends_on: [api-gateway]

volumes:
  db_data:
```

### Kubernetes Deployment (Future)

```yaml
apiVersion: v1
kind: Service
metadata:
  name: api-gateway
spec:
  selector:
    app: api-gateway
  ports:
    - port: 8080
      targetPort: 8080

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway-deployment
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      labels:
        app: api-gateway
    spec:
      containers:
        - name: api-gateway
          image: api-gateway:latest
          ports:
            - containerPort: 8080
          env:
            - name: DATABASE_URL
              valueFrom:
                configMapKeyRef:
                  name: app-config
                  key: database-url
```

---

## 📈 Scalability & Performance

### Horizontal Scaling Strategy

```
┌──────────────────────────────────────┐
│    Load Balancer (Nginx/HAProxy)     │
└──────────────────────────────────────┘
     ↙         ↙         ↙
┌──────────┐ ┌──────────┐ ┌──────────┐
│  API GW  │ │  API GW  │ │  API GW  │
│Instance1 │ │Instance2 │ │Instance3 │
└──────────┘ └──────────┘ └──────────┘
     ↓         ↓         ↓
┌────────────────────────────────────┐
│   Shared Database (MySQL)          │
│   Connection Pool: 20-50           │
└────────────────────────────────────┘
```

### Caching Strategy

- **Frontend Cache**: Browser caching for static assets
- **API Response Cache**: Redis for frequent queries
- **Database Cache**: MySQL query cache
- **CDN**: CloudFlare/AWS CloudFront for assets

### Performance Optimization

```
Frontend
├── Code Splitting (Vite)
├── Lazy Loading Components
├── Minification & Compression
├── Image Optimization
└── HTTP/2 Push

Backend
├── Database Indexing
├── Query Optimization
├── Connection Pooling (HikariCP)
├── Async Processing
└── Message Queues (Future)
```

---

## 📨 Event-Driven Architecture (Future)

```
┌─────────────────────────────────────────┐
│        Event Bus (RabbitMQ/Kafka)      │
└─────────────────────────────────────────┘
          ↙       ↙       ↙
  ┌──────────┐ ┌──────────┐ ┌──────────┐
  │ Order    │ │Inventory │ │Notification│
  │Created   │ │Updated   │ │Service     │
  │Event     │ │Event     │ │            │
  └──────────┘ └──────────┘ └──────────┘
```

---

## 🔄 Service Communication

### Synchronous (REST/HTTP)
- Frontend ↔ API Gateway
- API Gateway ↔ Microservices
- **Use Case**: Real-time requests requiring immediate response

### Asynchronous (Message Queue)
- Order Processing
- Inventory Updates
- Notifications
- **Use Case**: Background jobs, eventual consistency

---

## 📊 Monitoring & Observability

### Metrics Collection
```
Application Metrics:
├── Request Count
├── Response Time
├── Error Rate
├── CPU Usage
└── Memory Usage

Business Metrics:
├── Orders/Day
├── Revenue
├── Conversion Rate
└── Cart Abandonment
```

### Logging Strategy

```
┌─────────────────┐
│  Microservices  │
│  (Log to files) │
└────────┬────────┘
         ↓
┌─────────────────────────────────┐
│  ELK Stack (Future)             │
│  ├── Elasticsearch (Search)     │
│  ├── Logstash (Process)         │
│  └── Kibana (Visualize)         │
└─────────────────────────────────┘
```

---

## 🔄 CI/CD Pipeline Architecture

```
┌──────────────────────────────────────┐
│  Git Push to main                    │
└──────────────────────────────────────┘
         ↓
┌──────────────────────────────────────┐
│  GitHub Actions Workflow Triggered   │
└──────────────────────────────────────┘
         ↓
┌──────────────────────────────────────┐
│  Build Stage                         │
│  ├── Maven Clean Package (Backend)   │
│  └── npm build (Frontend)            │
└──────────────────────────────────────┘
         ↓
┌──────────────────────────────────────┐
│  Test Stage                          │
│  ├── Unit Tests                      │
│  └── Integration Tests               │
└──────────────────────────────────────┘
         ↓
┌──────────────────────────────────────┐
│  Lint Stage                          │
│  ├── ESLint (Frontend)               │
│  └── CheckStyle (Backend)            │
└──────────────────────────────────────┘
         ↓
┌──────────────────────────────────────┐
│  Deploy Stage (Manual Approval)      │
│  ├── Docker Build                    │
│  ├── Push to Registry                │
│  └── Deploy to Environment           │
└──────────────────────────────────────┘
```

---

## 🎯 Technology Selection Rationale

| Component | Technology | Reason |
|-----------|-----------|--------|
| **Backend** | Spring Boot | Enterprise-grade, mature, excellent for microservices |
| **Frontend** | React 19 | Component-based, excellent performance, large ecosystem |
| **Build Tool (Frontend)** | Vite | Fast bundling, modern tooling, great DX |
| **Build Tool (Backend)** | Maven | Dependency management, standardized structure |
| **Database** | MySQL | ACID compliance, relational data, proven stability |
| **Container** | Docker | Standardized deployments, easy scaling |
| **Orchestration** | Docker Compose | Development simplicity, Docker Swarm readiness |
| **CI/CD** | GitHub Actions | Native to GitHub, free, minimal configuration |
| **Authentication** | JWT | Stateless, scalable, mobile-friendly |
| **Payment** | Razorpay | Indian payments, comprehensive SDK, good documentation |

---

## 📋 Architecture Decisions

### 1. **Microservices over Monolith**
- ✅ **Independent deployment** of services
- ✅ **Technology flexibility** per service
- ✅ **Scalability** of specific services
- ❌ **Complexity** in communication and testing

### 2. **Shared Database**
- ✅ **Simplicity** for initial development
- ✅ **Easier transactions** across services
- ❌ **Tight coupling** between services
- **Future**: Migrate to database-per-service

### 3. **JWT Authentication**
- ✅ **Stateless** (no session storage)
- ✅ **Scalable** (no server state needed)
- ✅ **Mobile-friendly**
- ✅ **Secure** with signed tokens

### 4. **REST API**
- ✅ **Simple** and well-understood
- ✅ **HTTP standard** compliance
- ❌ **Over-fetching** and **under-fetching**
- **Future**: Consider GraphQL for complex queries

---

## 🚀 Future Enhancements

### Phase 2: Advanced Features
- [ ] Event-driven architecture with message queues
- [ ] Distributed transaction management (Saga pattern)
- [ ] Service mesh (Istio)
- [ ] Kubernetes orchestration
- [ ] GraphQL API layer

### Phase 3: Enterprise Features
- [ ] Multi-tenancy support
- [ ] Advanced analytics
- [ ] Machine learning recommendations
- [ ] Real-time notifications (WebSocket)
- [ ] Mobile app (React Native)

### Phase 4: Operations
- [ ] APM (Application Performance Monitoring)
- [ ] Distributed tracing (Jaeger)
- [ ] Advanced logging (ELK Stack)
- [ ] Automated scaling policies
- [ ] Disaster recovery & backup strategies

---

## 📚 Related Documentation

- [README.md](../README.md) - Project overview and setup
- [Contributing Guide](../CONTRIBUTING.md) - Development guidelines
- [API Reference](./API.md) - Detailed API documentation
- [Database Schema](./DATABASE.md) - Complete database design

---

**Last Updated**: September 2026  
**Architecture Version**: 1.0.0  
**Status**: Production Ready
