package com.example.Cart_Service.exception;

/**
 * Thrown when a seller attempts to update or delete a product they do not own.
 * Also thrown when a CUSTOMER attempts a seller-only action.
 *
 * Mapped to HTTP 403 Forbidden by GlobalExceptionHandler.
 * (Distinct from Spring Security's AccessDeniedException which handles role checks)
 */
public class UnauthorizedException extends RuntimeException {

    public UnauthorizedException(String message) {
        super(message);
    }
}
