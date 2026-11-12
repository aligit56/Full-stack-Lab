const { validateCartItem, validateCartQuantity } = require("./validation");

class CartController {
  constructor(service) {
    this.service = service;
  }

  get(cartId) {
    return this.service.get(cartId);
  }

  addItem(cartId, body) {
    const { productId, quantity } = validateCartItem(body);
    return this.service.addItem(cartId, productId, quantity);
  }

  setQuantity(cartId, productId, body) {
    const quantity = validateCartQuantity(body);
    return this.service.setQuantity(cartId, productId, quantity);
  }

  removeItem(cartId, productId) {
    return this.service.removeItem(cartId, productId);
  }
}

module.exports = CartController;
