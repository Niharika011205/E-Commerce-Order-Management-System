# ShopMind - AI-Powered Enterprise E-Commerce Platform

Demo video : https://drive.google.com/file/d/1kB10DCI8zoD7HTbJtMAjQMHlTg16vQ3S/view?usp=sharing

A modern, scalable microservices-based e-commerce platform built with Spring Boot backend services and React frontend, featuring AI-powered product recommendations, integrated payment processing, and comprehensive order management.

## 🎯 Overview

ShopMind is an enterprise-grade e-commerce solution that combines:
- **Microservices Architecture** - Independently deployable backend services
- **AI Recommendations** - Intelligent product suggestions for enhanced shopping experience
- **Payment Integration** - Razorpay integration for seamless transactions
- **Multi-role Support** - Separate workflows for customers and sellers
- **Modern Frontend** - React 19 with Vite for optimal performance

## 🏗️ Architecture

### Backend Services (Spring Boot 4.1.0 + Java 21)

| Service | Purpose | Port |
|---------|---------|------|
| **API-Gateway** | Central entry point, request routing & load balancing | 8080 |
| **Auth-Service** | User authentication, JWT token generation & validation | 8081 |
| **Cart-Service** | Shopping cart management, item operations | 8082 |
| **Inventory-Service** | Product stock management, inventory tracking | 8083 |

### Frontend (React 19 + Vite)

- **AI-Ecommerce-Platform** - Customer and seller portal
  - Customer: Browse products, add to cart, checkout, view orders
  - Seller: Manage product listings, view orders, analytics

## 🛠️ Tech Stack

### Backend
- **Framework**: Spring Boot 4.1.0
- **Language**: Java 21
- **Build Tool**: Maven
- **Database**: MySQL (configured via application.properties)
- **Testing**: JUnit & Mockito

### Frontend
- **Framework**: React 19.2.7
- **Build Tool**: Vite 8.1.1
- **Testing**: Vitest
- **Linting**: ESLint
- **Node.js**: v22+ (for Rolldown compatibility)

### Infrastructure
- **Container**: Docker & Docker Compose
- **CI/CD**: GitHub Actions

## 📋 Prerequisites

### For Local Development

- **Java 21** - [Download JDK 21](https://www.oracle.com/java/technologies/downloads/#java21)
- **Node.js 22+** - [Download Node.js](https://nodejs.org/)
- **Maven 3.8+** - Included with Spring Boot or install separately
- **Docker & Docker Compose** - [Get Docker](https://www.docker.com/products/docker-desktop)

### Database
- MySQL 8.0+ (required for all services)

## 🚀 Quick Start

### Option 1: Docker Compose (Recommended)

```bash
# Navigate to project root
cd ShopMind-AI-Powered-Enterprise-E-Commerce-Platform

# Start all services
docker-compose up -d

# Services will be available at:
# API-Gateway: http://localhost:8080
# Frontend: http://localhost:3000
```

### Option 2: Local Development

#### 1. Backend Services

```bash
# API-Gateway
cd API-Gateway/API-Gateway
mvn spring-boot:run

# Auth-Service (new terminal)
cd Auth-Service/Auth-Service
mvn spring-boot:run

# Cart-Service (new terminal)
cd Cart-Service/Cart-Service
mvn spring-boot:run

# Inventory-Service (new terminal)
cd Inventory-Service/Inventory-Service
mvn spring-boot:run
```

#### 2. Frontend

```bash
cd Frontend/AI-Ecommerce-Platform

# Install dependencies
npm install

# Development server
npm run dev

# Visit: http://localhost:5173
```

## 📦 Build & Deploy

### Build All Services

```bash
# Using Windows batch script
./start_all.bat

# Or manually with Maven
mvn clean package -DskipTests
```

### Production Build

```bash
# Backend
mvn clean package

# Frontend
npm run build
```

## ✅ Testing

### Backend Unit Tests

```bash
# Run all tests
mvn test

# Run specific service tests
cd API-Gateway/API-Gateway && mvn test
```

### Frontend Tests

```bash
cd Frontend/AI-Ecommerce-Platform

# Run unit tests
npm run test

# Run linter
npm run lint
```

## 🔄 CI/CD Pipeline

This project uses **GitHub Actions** for continuous integration and deployment.

### Workflow Triggers
- **Push to main** - Triggers builds for changed services
- **Pull Requests** - Validates code before merge

### Available Workflows

| Workflow | Trigger | Actions |
|----------|---------|---------|
| `api-gateway.yml` | API-Gateway/* changes | Build, Test, Package |
| `auth-service.yml` | Auth-Service/* changes | Build, Test, Package |
| `cart-service.yml` | Cart-Service/* changes | Build, Test, Package |
| `inventory-service.yml` | Inventory-Service/* changes | Build, Test, Package |
| `frontend.yml` | Frontend/* changes | Install, Lint, Test, Build |

**View CI/CD Status**: [GitHub Actions](https://github.com/Niharika011205/ShopMind-AI-Powered-Enterprise-E-Commerce-Platform/actions)

## 📂 Project Structure

```
ShopMind-AI-Powered-Enterprise-E-Commerce-Platform/
├── .github/workflows/              # GitHub Actions CI/CD workflows
├── API-Gateway/                    # API Gateway microservice
│   └── API-Gateway/
│       ├── pom.xml
│       └── src/
├── Auth-Service/                   # Authentication microservice
│   └── Auth-Service/
│       ├── pom.xml
│       └── src/
├── Cart-Service/                   # Shopping cart microservice
│   └── Cart-Service/
│       ├── pom.xml
│       └── src/
├── Inventory-Service/              # Inventory management microservice
│   └── Inventory-Service/
│       ├── pom.xml
│       └── src/
├── Frontend/                       # React frontend application
│   └── AI-Ecommerce-Platform/
│       ├── package.json
│       ├── vite.config.js
│       └── src/
├── docker-compose.yml              # Docker orchestration
├── start_all.bat                   # Windows batch script
└── README.md                       # This file
```

## 🔐 Configuration

### Backend Services

Each service has an `application.properties` file:

```properties
# Example configuration
spring.application.name=api-gateway
server.port=8080
spring.datasource.url=jdbc:mysql://localhost:3306/shop_mind
spring.datasource.username=root
spring.datasource.password=your_password
```

**Update database credentials** in each service's `application.properties` before running.

### Frontend Environment

Create `.env` file in `Frontend/AI-Ecommerce-Platform/`:

```env
VITE_API_BASE_URL=http://localhost:8080
VITE_RAZORPAY_KEY_ID=your_razorpay_key
```

## 🛒 Features

### Customer Portal
- ✨ Browse AI-recommended products
- 🛒 Add items to cart
- 💳 Secure payment with Razorpay
- 📦 Order tracking & history
- ⭐ Product reviews & ratings
- 👤 User profile management

### Seller Portal
- 📋 Manage product listings
- 📊 View sales analytics
- 📦 Track orders
- ✏️ Update inventory

### Admin Features
- 🎯 AI product recommendations engine
- 👥 User management
- 📈 Analytics dashboard

## 🤝 Contributing

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** changes (`git commit -m 'Add amazing feature'`)
4. **Push** to branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Code Standards
- Follow Spring Boot conventions for backend
- Use ESLint rules for frontend
- Write unit tests for new features
- Ensure all CI/CD checks pass

## 📝 API Documentation

API documentation will be available at:
```
http://localhost:8080/swagger-ui.html  (when Swagger is configured)
```

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Kill process using port 8080
# Windows
netstat -ano | findstr :8080
taskkill /PID <PID> /F

# macOS/Linux
lsof -i :8080
kill -9 <PID>
```

### Maven Build Failures
```bash
# Clear Maven cache
mvn clean -DskipTests

# Update dependencies
mvn dependency:resolve
```

### Node Modules Issues
```bash
# Clear node_modules cache
rm -rf Frontend/AI-Ecommerce-Platform/node_modules
npm install --legacy-peer-deps
```

### Database Connection Issues
- Ensure MySQL is running
- Verify credentials in `application.properties`
- Check database exists and tables are created

## 📞 Support

For issues and questions:
- 📧 Email: [Create an issue on GitHub](https://github.com/Niharika011205/ShopMind-AI-Powered-Enterprise-E-Commerce-Platform/issues)
- 📖 Documentation: Check individual service README files
- 💬 Discussions: Use GitHub Discussions for feature requests

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👨‍💻 Author

**Niharika**
- GitHub: [@Niharika011205](https://github.com/Niharika011205)

---

**Last Updated**: September 2026  
**Version**: 1.0.0
