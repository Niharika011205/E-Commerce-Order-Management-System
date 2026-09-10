package com.example.Auth_Service.exception;

/**
 * Thrown when a JWT token is invalid, malformed, or has been tampered with.
 */
public class InvalidTokenException extends RuntimeException {

    public InvalidTokenException(String message) {
        super(message);
    }
}
