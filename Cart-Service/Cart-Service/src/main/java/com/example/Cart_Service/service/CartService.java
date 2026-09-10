package com.example.Cart_Service.service;

import com.example.Cart_Service.dto.request.AddToCartRequest;
import com.example.Cart_Service.dto.request.UpdateCartItemRequest;
import com.example.Cart_Service.dto.response.CartResponse;

public interface CartService {
    CartResponse getCart(Long customerId);
    CartResponse addToCart(Long customerId, AddToCartRequest request);
    CartResponse updateCartItem(Long customerId, Long productId, UpdateCartItemRequest request);
    CartResponse removeFromCart(Long customerId, Long productId);
    void clearCart(Long customerId);
}
