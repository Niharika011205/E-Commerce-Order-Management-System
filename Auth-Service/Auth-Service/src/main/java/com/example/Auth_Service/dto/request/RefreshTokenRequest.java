package com.example.Auth_Service.dto.request;

/**
 * Placeholder DTO for the refresh token endpoint.
 * The refresh token is read from the HttpOnly cookie — not from the request body.
 * This DTO exists for API contract consistency and future extensibility.
 */
public class RefreshTokenRequest {
    // Intentionally empty — refresh token comes from HttpOnly cookie
}
