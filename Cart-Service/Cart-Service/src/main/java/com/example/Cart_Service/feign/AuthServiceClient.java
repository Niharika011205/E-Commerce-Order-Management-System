package com.example.Cart_Service.feign;

import com.example.Cart_Service.dto.response.AuthValidationResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;

/**
 * Feign client for the Auth-Service — used exclusively for remote JWT validation.
 *
 * On every authenticated request to Product-Service, JwtAuthenticationFilter
 * extracts the "access_token" cookie and calls GET /auth/validate on Auth-Service.
 * Auth-Service validates the token cryptographically and returns the user's
 * identity (userId, username, role) which is then stored in the SecurityContext.
 *
 * Service discovery:
 *   name = "Auth-Service" matches spring.application.name in Auth-Service.
 *   Spring Cloud LoadBalancer (Eureka) resolves this to the actual Auth-Service
 *   instance(s) — no hardcoded host:port required.
 *
 * Failure handling:
 *   FeignException.Unauthorized (401) — token invalid/expired → unauthenticated
 *   FeignException (other 4xx/5xx)    → auth unavailable → unauthenticated
 *   Network/timeout exception          → auth unavailable → unauthenticated
 *   In all failure cases, JwtAuthenticationFilter logs the error and allows the
 *   request to proceed as unauthenticated; Spring Security then rejects it if
 *   the endpoint requires authentication.
 */
@FeignClient(name = "Auth-Service")
public interface AuthServiceClient {

    /**
     * Validate an ACCESS JWT token.
     *
     * @param authHeader  "Bearer {token}" — the access_token cookie value prefixed with "Bearer "
     * @return            Validated user identity (userId, username, role)
     * @throws feign.FeignException  on 4xx/5xx response from Auth-Service
     */
    @GetMapping("/auth/validate")
    AuthValidationResponse validateToken(@RequestHeader("Authorization") String authHeader);
}
