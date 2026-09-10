package com.example.Cart_Service.dto.request;

public class AddToCartRequest {
    private Long productId;
    private Integer quantity;

    // Getters and Setters (No Lombok)
    public Long getProductId() { return productId; }
    public void setProductId(Long productId) { this.productId = productId; }
    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }
}
