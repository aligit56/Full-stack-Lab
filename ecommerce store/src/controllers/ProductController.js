const { validateProduct } = require("./validation");

class ProductController {
  constructor(service) {
    this.service = service;
  }

  list(filters) {
    return this.service.list(filters);
  }

  get(id) {
    return this.service.get(id);
  }

  create(body) {
    return this.service.create(validateProduct(body));
  }

  update(id, body, { replace = false } = {}) {
    const attributes = validateProduct(body, { partial: !replace });
    return this.service.update(id, attributes, { replace });
  }

  delete(id) {
    return this.service.delete(id);
  }
}

module.exports = ProductController;
