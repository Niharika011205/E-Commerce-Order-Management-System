package com.example.Auth_Service.exception;

/**
 * Thrown when authentication fails due to invalid credentials
 * (wrong password or non-existent username/email).
 */
public class InvalidCredentialsException extends RuntimeException {

    public InvalidCredentialsException(String message) {
        super(message);
    }
}
