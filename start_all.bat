@echo off
echo Starting Service-Registry first...
start "Service Registry" cmd /k "title Service-Registry && cd Service-Registry\Service-Registry && mvn spring-boot:run"

echo Waiting 20 seconds for Eureka to start...
timeout /t 20

echo Starting remaining microservices...
start "API Gateway" cmd /k "title API-Gateway && cd API-Gateway\API-Gateway && mvn spring-boot:run"
start "Auth Service" cmd /k "title Auth-Service && cd Auth-Service\Auth-Service && mvn spring-boot:run"
start "User Service" cmd /k "title User-Service && cd User-Service\User-Service && mvn spring-boot:run"
start "Product Service" cmd /k "title Product-Service && cd Product-Service\Product-Service && mvn spring-boot:run"
start "Inventory Service" cmd /k "title Inventory-Service && cd Inventory-Service\Inventory-Service && mvn spring-boot:run"
start "Cart Service" cmd /k "title Cart-Service && cd Cart-Service\Cart-Service && mvn spring-boot:run"
start "Order Service" cmd /k "title Order-Service && cd Order-Service\Order-Service && mvn spring-boot:run"
start "Recommendation Service" cmd /k "title Recommendation-Service && cd Recommendation-Service && run.bat"

echo Starting payment service...
start "Payment Service" cmd /k "title Payment-Service && cd Payment-Service && mvn spring-boot:run"

echo Starting Frontend...
start "Frontend" cmd /k "title Frontend && cd Frontend\AI-Ecommerce-Platform && npm run dev"

echo All services have been launched!
