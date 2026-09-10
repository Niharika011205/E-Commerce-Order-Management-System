package com.example.Cart_Service.service;

import com.example.Cart_Service.dto.request.AddToCartRequest;
import com.example.Cart_Service.dto.request.UpdateCartItemRequest;
import com.example.Cart_Service.dto.response.CartItemResponse;
import com.example.Cart_Service.dto.response.CartResponse;
import com.example.Cart_Service.dto.response.ProductResponse;
import com.example.Cart_Service.exception.CartNotFoundException;
import com.example.Cart_Service.feign.ProductServiceClient;
import com.example.Cart_Service.model.Cart;
import com.example.Cart_Service.model.CartItem;
import com.example.Cart_Service.repository.CartRepository;
import feign.FeignException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class CartServiceImpl implements CartService {

    @Autowired
    private CartRepository cartRepository;

    @Autowired
    private ProductServiceClient productServiceClient;

    @Override
    @Transactional
    public CartResponse getCart(Long customerId) {
        Cart cart = getOrCreateCart(customerId);
        return buildCartResponse(cart);
    }

    @Override
    @Transactional
    public CartResponse addToCart(Long customerId, AddToCartRequest request) {
        if (request.getQuantity() == null || request.getQuantity() <= 0) {
            throw new IllegalArgumentException("Quantity must be greater than 0");
        }

        // Validate product exists in Product-Service (throws FeignException.NotFound if not)
        try {
            ProductResponse product = productServiceClient.getProductById(request.getProductId());
            if (product == null || Boolean.FALSE.equals(product.getAvailable())) {
                throw new IllegalArgumentException("Product is not available for purchase");
            }
        } catch (FeignException.NotFound e) {
            throw new IllegalArgumentException("Product does not exist");
        }

        Cart cart = getOrCreateCart(customerId);
        
        Optional<CartItem> existingItem = cart.getItems().stream()
                .filter(item -> item.getProductId().equals(request.getProductId()))
                .findFirst();

        if (existingItem.isPresent()) {
            existingItem.get().setQuantity(existingItem.get().getQuantity() + request.getQuantity());
        } else {
            CartItem newItem = new CartItem();
            newItem.setProductId(request.getProductId());
            newItem.setQuantity(request.getQuantity());
            cart.addItem(newItem);
        }

        cartRepository.save(cart);
        return buildCartResponse(cart);
    }

    @Override
    @Transactional
    public CartResponse updateCartItem(Long customerId, Long productId, UpdateCartItemRequest request) {
        if (request.getQuantity() == null || request.getQuantity() <= 0) {
            throw new IllegalArgumentException("Quantity must be greater than 0. Use delete to remove.");
        }

        Cart cart = cartRepository.findByCustomerId(customerId)
                .orElseThrow(() -> new CartNotFoundException("Cart not found for customer"));

        CartItem item = cart.getItems().stream()
                .filter(ci -> ci.getProductId().equals(productId))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Product not in cart"));

        item.setQuantity(request.getQuantity());
        cartRepository.save(cart);
        
        return buildCartResponse(cart);
    }

    @Override
    @Transactional
    public CartResponse removeFromCart(Long customerId, Long productId) {
        Cart cart = cartRepository.findByCustomerId(customerId)
                .orElseThrow(() -> new CartNotFoundException("Cart not found for customer"));

        CartItem item = cart.getItems().stream()
                .filter(ci -> ci.getProductId().equals(productId))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Product not in cart"));

        cart.removeItem(item);
        cartRepository.save(cart);
        
        return buildCartResponse(cart);
    }

    @Override
    @Transactional
    public void clearCart(Long customerId) {
        cartRepository.findByCustomerId(customerId).ifPresent(cart -> {
            cart.getItems().clear();
            cartRepository.save(cart);
        });
    }

    private Cart getOrCreateCart(Long customerId) {
        return cartRepository.findByCustomerId(customerId).orElseGet(() -> {
            Cart newCart = new Cart();
            newCart.setCustomerId(customerId);
            return cartRepository.save(newCart);
        });
    }

    /**
     * Stitches the Cart data with live Product data from Product-Service
     */
    private CartResponse buildCartResponse(Cart cart) {
        List<CartItemResponse> itemResponses = new ArrayList<>();
        double subtotal = 0.0;

        for (CartItem item : cart.getItems()) {
            try {
                // Fetch real-time product data
                ProductResponse product = productServiceClient.getProductById(item.getProductId());
                
                double price = product.getPrice() != null ? product.getPrice().doubleValue() : 0.0;
                double itemTotal = price * item.getQuantity();
                subtotal += itemTotal;
                
                String thumb = (product.getImageUrls() != null && !product.getImageUrls().isEmpty()) ? product.getImageUrls().get(0) : null;

                itemResponses.add(new CartItemResponse.Builder()
                        .id(item.getId())
                        .productId(item.getProductId())
                        .name(product.getName())
                        .thumbnailUrl(thumb)
                        .price(price)
                        .quantity(item.getQuantity())
                        .itemTotal(itemTotal)
                        .build());
            } catch (FeignException e) {
                // If product is deleted or unavailable, it gracefully fails the fetch but keeps the ID
                itemResponses.add(new CartItemResponse.Builder()
                        .id(item.getId())
                        .productId(item.getProductId())
                        .name("Unknown Product")
                        .price(0.0)
                        .quantity(item.getQuantity())
                        .itemTotal(0.0)
                        .build());
            }
        }

        return new CartResponse.Builder()
                .cartId(cart.getId())
                .customerId(cart.getCustomerId())
                .items(itemResponses)
                .subtotal(subtotal)
                .build();
    }
}
