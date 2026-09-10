package com.example.Cart_Service.dto.response;

public class CartItemResponse {
    private Long id;
    private Long productId;
    private String name;
    private String thumbnailUrl;
    private Double price;
    private Integer quantity;
    private Double itemTotal;

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getProductId() { return productId; }
    public void setProductId(Long productId) { this.productId = productId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getThumbnailUrl() { return thumbnailUrl; }
    public void setThumbnailUrl(String thumbnailUrl) { this.thumbnailUrl = thumbnailUrl; }
    public Double getPrice() { return price; }
    public void setPrice(Double price) { this.price = price; }
    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }
    public Double getItemTotal() { return itemTotal; }
    public void setItemTotal(Double itemTotal) { this.itemTotal = itemTotal; }

    public static class Builder {
        private Long id;
        private Long productId;
        private String name;
        private String thumbnailUrl;
        private Double price;
        private Integer quantity;
        private Double itemTotal;

        public Builder id(Long id) { this.id = id; return this; }
        public Builder productId(Long productId) { this.productId = productId; return this; }
        public Builder name(String name) { this.name = name; return this; }
        public Builder thumbnailUrl(String thumbnailUrl) { this.thumbnailUrl = thumbnailUrl; return this; }
        public Builder price(Double price) { this.price = price; return this; }
        public Builder quantity(Integer quantity) { this.quantity = quantity; return this; }
        public Builder itemTotal(Double itemTotal) { this.itemTotal = itemTotal; return this; }

        public CartItemResponse build() {
            CartItemResponse r = new CartItemResponse();
            r.setId(id);
            r.setProductId(productId);
            r.setName(name);
            r.setThumbnailUrl(thumbnailUrl);
            r.setPrice(price);
            r.setQuantity(quantity);
            r.setItemTotal(itemTotal);
            return r;
        }
    }
}
