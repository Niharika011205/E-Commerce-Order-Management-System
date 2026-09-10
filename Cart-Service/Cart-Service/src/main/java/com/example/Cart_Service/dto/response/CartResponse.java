package com.example.Cart_Service.dto.response;

import java.util.List;

public class CartResponse {
    private Long cartId;
    private Long customerId;
    private List<CartItemResponse> items;
    private Double subtotal;

    // Getters and Setters
    public Long getCartId() { return cartId; }
    public void setCartId(Long cartId) { this.cartId = cartId; }
    public Long getCustomerId() { return customerId; }
    public void setCustomerId(Long customerId) { this.customerId = customerId; }
    public List<CartItemResponse> getItems() { return items; }
    public void setItems(List<CartItemResponse> items) { this.items = items; }
    public Double getSubtotal() { return subtotal; }
    public void setSubtotal(Double subtotal) { this.subtotal = subtotal; }

    public static class Builder {
        private Long cartId;
        private Long customerId;
        private List<CartItemResponse> items;
        private Double subtotal;

        public Builder cartId(Long cartId) { this.cartId = cartId; return this; }
        public Builder customerId(Long customerId) { this.customerId = customerId; return this; }
        public Builder items(List<CartItemResponse> items) { this.items = items; return this; }
        public Builder subtotal(Double subtotal) { this.subtotal = subtotal; return this; }

        public CartResponse build() {
            CartResponse r = new CartResponse();
            r.setCartId(cartId);
            r.setCustomerId(customerId);
            r.setItems(items);
            r.setSubtotal(subtotal);
            return r;
        }
    }
}
