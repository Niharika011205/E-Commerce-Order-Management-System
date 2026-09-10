package com.example.Cart_Service.security;

/**
 * Immutable holder for the authenticated user's identity.
 *
 * Set as the principal in UsernamePasswordAuthenticationToken by
 * JwtAuthenticationFilter after successful remote token validation.
 *
 * Controllers retrieve this via:
 *   Authentication auth = SecurityContextHolder.getContext().getAuthentication();
 *   AuthenticatedUser user = (AuthenticatedUser) auth.getPrincipal();
 *   Long userId = user.getUserId();
 *
 * This avoids a database lookup in Product-Service — all identity
 * information comes directly from the validated JWT claims.
 */
public class AuthenticatedUser {

    private final Long userId;
    private final String username;
    private final String role;

    public AuthenticatedUser(Long userId, String username, String role) {
        this.userId = userId;
        this.username = username;
        this.role = role;
    }

    public Long getUserId() {
        return userId;
    }

    public String getUsername() {
        return username;
    }

    public String getRole() {
        return role;
    }
}
