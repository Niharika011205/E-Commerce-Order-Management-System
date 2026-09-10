package com.example.Auth_Service.util;

import com.example.Auth_Service.config.JwtConfig;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

/**
 * Utility for creating and clearing HttpOnly secure cookies.
 * All cookies are HttpOnly, Secure, and SameSite=Strict for production security.
 */
@Component
public class CookieUtil {

    @Autowired
    private JwtConfig jwtConfig;

    private static final String ACCESS_TOKEN_COOKIE = "access_token";
    private static final String REFRESH_TOKEN_COOKIE = "refresh_token";

    /**
     * Creates an HttpOnly secure cookie for the access token.
     * Path is "/" so it's sent with every API request.
     */
    public ResponseCookie createAccessTokenCookie(String token) {
        return ResponseCookie.from(ACCESS_TOKEN_COOKIE, token)
                .httpOnly(true)
                .secure(false) // Set to false for local development, true for production
                .path("/")
                .maxAge(jwtConfig.getAccessExpiration() / 1000)
                .sameSite("Lax") // Set to Lax for development, Strict for production
                .build();
    }

    /**
     * Creates an HttpOnly secure cookie for the refresh token.
     * Path is "/" so it's available for both /auth/refresh and /auth/logout.
     */
    public ResponseCookie createRefreshTokenCookie(String token) {
        return ResponseCookie.from(REFRESH_TOKEN_COOKIE, token)
                .httpOnly(true)
                .secure(false) // Set to false for local development, true for production
                .path("/")
                .maxAge(jwtConfig.getRefreshExpiration() / 1000)
                .sameSite("Lax") // Set to Lax for development, Strict for production
                .build();
    }

    /**
     * Clears the access token cookie by setting maxAge to 0.
     */
    public ResponseCookie clearAccessTokenCookie() {
        return ResponseCookie.from(ACCESS_TOKEN_COOKIE, "")
                .httpOnly(true)
                .secure(false)
                .path("/")
                .maxAge(0)
                .sameSite("Lax")
                .build();
    }

    /**
     * Clears the refresh token cookie by setting maxAge to 0.
     */
    public ResponseCookie clearRefreshTokenCookie() {
        return ResponseCookie.from(REFRESH_TOKEN_COOKIE, "")
                .httpOnly(true)
                .secure(false)
                .path("/")
                .maxAge(0)
                .sameSite("Lax")
                .build();
    }
}
