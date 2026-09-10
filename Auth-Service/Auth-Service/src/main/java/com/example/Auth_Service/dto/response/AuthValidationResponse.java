package com.example.Auth_Service.dto.response;

/**
 * Response payload for the token validation endpoint (GET /auth/validate).
 *
 * Returned to inter-service callers (e.g. Product-Service via Feign) after
 * successfully validating an ACCESS JWT. Contains the minimal user identity
 * information extracted from the token claims.
 */
public class AuthValidationResponse {

    private Long userId;
    private String username;
    private String role;

    // -------------------------------------------------------------------------
    // Constructors
    // -------------------------------------------------------------------------

    public AuthValidationResponse() {
    }

    public AuthValidationResponse(Long userId, String username, String role) {
        this.userId = userId;
        this.username = username;
        this.role = role;
    }

    // -------------------------------------------------------------------------
    // Getters & Setters
    // -------------------------------------------------------------------------

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    // -------------------------------------------------------------------------
    // Builder
    // -------------------------------------------------------------------------

    public static AuthValidationResponseBuilder builder() {
        return new AuthValidationResponseBuilder();
    }

    public static class AuthValidationResponseBuilder {

        private Long userId;
        private String username;
        private String role;

        public AuthValidationResponseBuilder userId(Long userId) {
            this.userId = userId;
            return this;
        }

        public AuthValidationResponseBuilder username(String username) {
            this.username = username;
            return this;
        }

        public AuthValidationResponseBuilder role(String role) {
            this.role = role;
            return this;
        }

        public AuthValidationResponse build() {
            return new AuthValidationResponse(userId, username, role);
        }
    }
}
