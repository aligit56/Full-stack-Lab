const ApiError = require("../ApiError");

const productFields = ["name", "price", "category", "description", "image"];

function validateObject(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw ApiError.badRequest("Request body must be a JSON object");
  }
  return body;
}

function validateProduct(body, { partial = false } = {}) {
  validateObject(body);
  const product = {};
  for (const field of productFields) {
    if (!Object.prototype.hasOwnProperty.call(body, field)) {
      if (!partial) throw ApiError.badRequest(`${field} is required`);
      continue;
    }
    const value = body[field];
    if (field === "price") {
      if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
        throw ApiError.badRequest("price must be a non-negative number");
      }
      product.price = value;
    } else {
      if (typeof value !== "string" || value.trim() === "") {
        throw ApiError.badRequest(`${field} must be a non-empty string`);
      }
      product[field] = value.trim();
    }
  }
  return product;
}

function validateCustomer(body) {
  validateObject(body);
  const fields = ["firstName", "lastName", "email", "address", "city", "postalCode", "payment"];
  const customer = {};
  for (const field of fields) {
    const value = body[field];
    if (typeof value !== "string" || value.trim() === "") {
      throw ApiError.badRequest(`${field} is required`);
    }
    customer[field] = value.trim();
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) {
    throw ApiError.badRequest("email must be valid");
  }
  return customer;
}

function validateCartItem(body) {
  validateObject(body);
  if (!Number.isSafeInteger(body.productId) || body.productId < 1) {
    throw ApiError.badRequest("productId must be a positive integer");
  }
  const quantity = body.quantity === undefined ? 1 : body.quantity;
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 99) {
    throw ApiError.badRequest("quantity must be an integer between 1 and 99");
  }
  return { productId: body.productId, quantity };
}

function validateCartQuantity(body) {
  validateObject(body);
  if (!Number.isSafeInteger(body.quantity) || body.quantity < 0 || body.quantity > 99) {
    throw ApiError.badRequest("quantity must be an integer between 0 and 99");
  }
  return body.quantity;
}

function validateCredentials(body, { signup = false } = {}) {
  validateObject(body);
  if (signup && (typeof body.name !== "string" || !body.name.trim() || body.name.trim().length > 80)) {
    throw ApiError.badRequest("name must be between 1 and 80 characters");
  }
  if (typeof body.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())) {
    throw ApiError.badRequest("email must be valid");
  }
  if (
    typeof body.password !== "string" ||
    (signup && body.password.length < 8) ||
    body.password.length > 128 ||
    body.password.length === 0
  ) {
    throw ApiError.badRequest(signup
      ? "password must be between 8 and 128 characters"
      : "password is required");
  }
  return {
    ...(signup ? { name: body.name.trim() } : {}),
    email: body.email.trim().toLowerCase(),
    password: body.password
  };
}

module.exports = {
  validateProduct,
  validateCustomer,
  validateCartItem,
  validateCartQuantity,
  validateSignup: (body) => validateCredentials(body, { signup: true }),
  validateLogin: (body) => validateCredentials(body)
};
