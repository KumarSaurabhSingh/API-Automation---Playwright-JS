class CartBuilder {
  constructor() {
    this.reset();
  }

  reset() {
    this.payload = {
      userId: 1,
      products: [],
    };
    return this;
  }

  withUserId(userId) {
    this.payload.userId = userId;
    return this;
  }

  withProduct(productId, quantity = 1) {
    this.payload.products.push({ id: productId, quantity });
    return this;
  }

  withProducts(products) {
    this.payload.products = [...products];
    return this;
  }

  build() {
    return structuredClone(this.payload);
  }
}

module.exports = CartBuilder;
