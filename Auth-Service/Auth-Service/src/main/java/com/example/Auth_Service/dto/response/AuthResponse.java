package com.example.Auth_Service.dto.response;

/**
 * Authentication response DTO.
 * JWT tokens are NOT included here — they are set as HttpOnly cookies.
 */
public class AuthResponse {

    private String message;
    private Long userId;
    private String username;
    private String role;

    public AuthResponse() {}

    public AuthResponse(String message, Long userId, String username, String role) {
        this.message = message;
        this.userId = userId;
        this.username = username;
        this.role = role;
    }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public static AuthResponseBuilder builder() {
        return new AuthResponseBuilder();
    }

    public static class AuthResponseBuilder {
        private String message;
        private Long userId;
        private String username;
        private String role;

        public AuthResponseBuilder message(String message) {
            this.message = message;
            return this;
        }

        public AuthResponseBuilder userId(Long userId) {
            this.userId = userId;
            return this;
        }

        public AuthResponseBuilder username(String username) {
            this.username = username;
            return this;
        }

        public AuthResponseBuilder role(String role) {
            this.role = role;
            return this;
        }

        public AuthResponse build() {
            return new AuthResponse(message, userId, username, role);
        }
    }
}
