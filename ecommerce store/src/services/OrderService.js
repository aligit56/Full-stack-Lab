const ApiError = require("../ApiError");

class OrderService {
  constructor(store) {
    this.store = store;
  }

  list() {
    return this.store.listOrders();
  }

  get(id) {
    const order = this.store.getOrder(id);
    if (!order) throw ApiError.notFound("Order not found");
    return order;
  }

  create(cartId, customer) {
    return this.store.createOrder(cartId, customer);
  }
}

module.exports = OrderService;
