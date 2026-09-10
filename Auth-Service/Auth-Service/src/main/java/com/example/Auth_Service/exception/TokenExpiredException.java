package com.example.Auth_Service.exception;

/**
 * Thrown when a JWT access token or refresh token has expired.
 */
public class TokenExpiredException extends RuntimeException {

    public TokenExpiredException(String message) {
        super(message);
    }
}
