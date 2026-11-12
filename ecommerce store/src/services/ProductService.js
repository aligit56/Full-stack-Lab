const ApiError = require("../ApiError");

class ProductService {
  constructor(store) {
    this.store = store;
  }

  list(filters) {
    return this.store.listProducts(filters);
  }

  get(id) {
    const product = this.store.getProduct(id);
    if (!product) throw ApiError.notFound("Product not found");
    return product;
  }

  create(attributes) {
    return this.store.createProduct(attributes);
  }

  async update(id, attributes, options) {
    const product = await this.store.updateProduct(id, attributes, options);
    if (!product) throw ApiError.notFound("Product not found");
    return product;
  }

  async delete(id) {
    if (!await this.store.deleteProduct(id)) {
      throw ApiError.notFound("Product not found");
    }
    return { message: "Product deleted" };
  }
}

module.exports = ProductService;
