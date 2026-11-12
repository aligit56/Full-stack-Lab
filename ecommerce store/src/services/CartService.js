class CartService {
  constructor(store) {
    this.store = store;
  }

  get(cartId) {
    return this.store.getCart(cartId);
  }

  addItem(cartId, productId, quantity) {
    return this.store.addCartItem(cartId, productId, quantity);
  }

  setQuantity(cartId, productId, quantity) {
    return this.store.setCartQuantity(cartId, productId, quantity);
  }

  removeItem(cartId, productId) {
    return this.store.removeCartItem(cartId, productId);
  }
}

module.exports = CartService;
