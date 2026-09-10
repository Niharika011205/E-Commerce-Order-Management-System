package com.example.Auth_Service.exception;

/**
 * Thrown when a user attempts to register with an email or username
 * that already exists in the system.
 */
public class UserAlreadyExistsException extends RuntimeException {

    public UserAlreadyExistsException(String message) {
        super(message);
    }
}
