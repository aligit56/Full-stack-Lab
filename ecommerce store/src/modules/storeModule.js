const Store = require("../Store");
const ProductService = require("../services/ProductService");
const CartService = require("../services/CartService");
const OrderService = require("../services/OrderService");
const AuthService = require("../services/AuthService");
const ProductController = require("../controllers/ProductController");
const CartController = require("../controllers/CartController");
const OrderController = require("../controllers/OrderController");
const AuthController = require("../controllers/AuthController");

function createStoreModule({ store = new Store() } = {}) {
  const productService = new ProductService(store);
  const cartService = new CartService(store);
  const orderService = new OrderService(store);
  const authService = new AuthService(store);

  return {
    products: new ProductController(productService),
    cart: new CartController(cartService),
    orders: new OrderController(orderService),
    auth: new AuthController(authService)
  };
}

module.exports = { createStoreModule };
