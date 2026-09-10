package com.example.Auth_Service.service;

import com.example.Auth_Service.dto.request.LoginRequest;
import com.example.Auth_Service.dto.request.RegisterRequest;
import com.example.Auth_Service.dto.response.AuthResponse;
import com.example.Auth_Service.dto.response.AuthValidationResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Authentication service interface.
 * Declares the contract for registration, login, token refresh, logout,
 * and inter-service token validation.
 * No implementation details — see AuthServiceImpl.
 */
public interface AuthService {

    AuthResponse register(RegisterRequest request);

    AuthResponse login(LoginRequest request, HttpServletResponse response);

    AuthResponse refreshToken(HttpServletRequest request, HttpServletResponse response);

    AuthResponse logout(HttpServletRequest request, HttpServletResponse response);

    /**
     * Validates an ACCESS JWT sent in the Authorization header.
     * Used by other microservices (e.g. Product-Service) via Feign to
     * authenticate requests without maintaining their own JWT secret.
     *
     * @param authHeader  Value of the "Authorization" header, expected format: "Bearer <token>"
     * @return            User identity extracted from the validated token
     * @throws com.example.Auth_Service.exception.InvalidTokenException   if the token is invalid/malformed
     * @throws com.example.Auth_Service.exception.TokenExpiredException   if the token has expired
     */
    AuthValidationResponse validateToken(String authHeader);
}
