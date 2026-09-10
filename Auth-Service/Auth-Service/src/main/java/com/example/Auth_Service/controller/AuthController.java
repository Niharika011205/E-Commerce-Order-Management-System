package com.example.Auth_Service.controller;

import com.example.Auth_Service.dto.request.LoginRequest;
import com.example.Auth_Service.dto.request.RegisterRequest;
import com.example.Auth_Service.dto.response.AuthResponse;
import com.example.Auth_Service.dto.response.AuthValidationResponse;
import com.example.Auth_Service.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Authentication REST controller.
 *
 * Endpoints:
 *   POST /auth/register  — Register a new CUSTOMER or SELLER
 *   POST /auth/login     — Login and receive JWT cookies
 *   POST /auth/refresh   — Refresh access token using refresh cookie
 *   POST /auth/logout    — Logout and clear all cookies
 *   GET  /auth/validate  — Validate a JWT; used by other microservices via Feign
 *
 * This controller delegates ALL business logic to AuthService.
 * It does NOT:
 *   - Encode passwords
 *   - Generate JWTs
 *   - Validate credentials
 *   - Access the repository directly
 */
@RestController
@RequestMapping("/auth")
public class AuthController {

    @Autowired
    private AuthService authService;

    /**
     * Register a new user (CUSTOMER or SELLER only).
     * ADMIN registration is rejected.
     * Does NOT generate JWT or set cookies — user must login after registration.
     */
    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        AuthResponse response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Login with username/email and password.
     * All roles (CUSTOMER, SELLER, ADMIN) can login.
     * Sets access_token and refresh_token as HttpOnly cookies.
     */
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request,
                                               HttpServletResponse response) {
        AuthResponse authResponse = authService.login(request, response);
        return ResponseEntity.ok(authResponse);
    }

    /**
     * Refresh the access token using the refresh token cookie.
     * Both tokens are rotated for security.
     */
    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refreshToken(HttpServletRequest request,
                                                      HttpServletResponse response) {
        AuthResponse authResponse = authService.refreshToken(request, response);
        return ResponseEntity.ok(authResponse);
    }

    /**
     * Logout the current user.
     * Clears refresh token from database and removes all cookies.
     */
    @PostMapping("/logout")
    public ResponseEntity<AuthResponse> logout(HttpServletRequest request,
                                                HttpServletResponse response) {
        AuthResponse authResponse = authService.logout(request, response);
        return ResponseEntity.ok(authResponse);
    }

    /**
     * Validate an ACCESS JWT token for inter-service authentication.
     *
     * Called by other microservices (e.g. Product-Service) via Feign on every
     * authenticated request.  The token is passed in the standard
     * "Authorization: Bearer <token>" header format.
     *
     * Returns 200 + user identity on success.
     * Returns 401 on invalid/expired token (via GlobalExceptionHandler).
     */
    @GetMapping("/validate")
    public ResponseEntity<AuthValidationResponse> validateToken(
            @RequestHeader("Authorization") String authHeader) {
        AuthValidationResponse response = authService.validateToken(authHeader);
        return ResponseEntity.ok(response);
    }
}
