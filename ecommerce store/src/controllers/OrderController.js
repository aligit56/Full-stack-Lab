const { validateCustomer } = require("./validation");

class OrderController {
  constructor(service) {
    this.service = service;
  }

  list() {
    return this.service.list();
  }

  get(id) {
    return this.service.get(id);
  }

  create(cartId, body) {
    return this.service.create(cartId, validateCustomer(body));
  }
}

module.exports = OrderController;
