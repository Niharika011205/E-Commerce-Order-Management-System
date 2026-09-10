package com.example.Cart_Service.dto.response;

/**
 * Deserialized response from Auth-Service's GET /auth/validate endpoint.
 *
 * Used as the return type for the AuthServiceClient Feign client.
 * Fields mirror Auth-Service's AuthValidationResponse exactly so
 * Jackson can deserialize the HTTP response body without any mapping code.
 */
public class AuthValidationResponse {

    private Long userId;
    private String username;
    private String role;

    // -----------------------------------------------------------------------
    // Constructors
    // -----------------------------------------------------------------------

    public AuthValidationResponse() {
    }

    public AuthValidationResponse(Long userId, String username, String role) {
        this.userId = userId;
        this.username = username;
        this.role = role;
    }

    // -----------------------------------------------------------------------
    // Getters & Setters
    // -----------------------------------------------------------------------

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
}
