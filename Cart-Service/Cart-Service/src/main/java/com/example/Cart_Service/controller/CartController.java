package com.example.Cart_Service.controller;

import com.example.Cart_Service.dto.request.AddToCartRequest;
import com.example.Cart_Service.dto.request.UpdateCartItemRequest;
import com.example.Cart_Service.dto.response.CartResponse;
import com.example.Cart_Service.security.AuthenticatedUser;
import com.example.Cart_Service.service.CartService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/cart")
public class CartController {

    @Autowired
    private CartService cartService;

    @GetMapping
    public ResponseEntity<CartResponse> getCart(Authentication authentication) {
        AuthenticatedUser customer = (AuthenticatedUser) authentication.getPrincipal();
        return ResponseEntity.ok(cartService.getCart(customer.getUserId()));
    }

    @PostMapping("/items")
    public ResponseEntity<CartResponse> addToCart(
            @RequestBody AddToCartRequest request, 
            Authentication authentication) {
        AuthenticatedUser customer = (AuthenticatedUser) authentication.getPrincipal();
        return ResponseEntity.ok(cartService.addToCart(customer.getUserId(), request));
    }

    @PutMapping("/items/{productId}")
    public ResponseEntity<CartResponse> updateCartItem(
            @PathVariable Long productId,
            @RequestBody UpdateCartItemRequest request,
            Authentication authentication) {
        AuthenticatedUser customer = (AuthenticatedUser) authentication.getPrincipal();
        return ResponseEntity.ok(cartService.updateCartItem(customer.getUserId(), productId, request));
    }

    @DeleteMapping("/items/{productId}")
    public ResponseEntity<CartResponse> removeFromCart(
            @PathVariable Long productId,
            Authentication authentication) {
        AuthenticatedUser customer = (AuthenticatedUser) authentication.getPrincipal();
        return ResponseEntity.ok(cartService.removeFromCart(customer.getUserId(), productId));
    }

    @DeleteMapping
    public ResponseEntity<Void> clearCart(Authentication authentication) {
        AuthenticatedUser customer = (AuthenticatedUser) authentication.getPrincipal();
        cartService.clearCart(customer.getUserId());
        return ResponseEntity.noContent().build();
    }
}
