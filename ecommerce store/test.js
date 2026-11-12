const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const Store = require("./src/Store");
const { createApp } = require("./src/app");

let temporaryDirectory;
let databasePath;
let server;
let baseUrl;

async function startServer() {
  server = createApp({ store: new Store(databasePath) });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
}

async function stopServer() {
  if (!server) return;
  const currentServer = server;
  const stopped = new Promise((resolve, reject) => {
    currentServer.close((error) => error ? reject(error) : resolve());
  });
  currentServer.closeAllConnections();
  await stopped;
  server = null;
}

test.before(async () => {
  temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "morrow-api-test-"));
  databasePath = path.join(temporaryDirectory, "store.json");
  await startServer();
});

test.after(async () => {
  await stopServer();
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

test("existing store files receive new seed products without replacing their data", () => {
  const legacyPath = path.join(temporaryDirectory, "legacy-store.json");
  fs.writeFileSync(legacyPath, JSON.stringify({
    products: [1, 2, 3, 4].map((id) => ({
      id,
      name: `Legacy product ${id}`,
      price: 10,
      category: "Decor",
      description: "Existing product",
      image: "https://example.com/product.jpg"
    })),
    carts: { existing: { items: [] } },
    orders: [],
    nextProductId: 5,
    nextOrderId: 1
  }));

  const store = new Store(legacyPath);
  assert.equal(store.listProducts().length, 8);
  assert.equal(store.getProduct(5).name, "Arc Stone Side Plate");
  assert.equal(store.state.nextProductId, 9);
  assert.deepEqual(store.state.carts, { existing: { items: [] } });
});

async function request(endpoint, method = "GET", body, headers = {}) {
  const response = await fetch(`${baseUrl}${endpoint}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...headers
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  return {
    status: response.status,
    body: await response.json(),
    headers: response.headers
  };
}

test("products support filters and complete CRUD with validation", async () => {
  const all = await request("/api/products");
  assert.equal(all.status, 200);
  assert.equal(all.body.data.length, 8);
  assert.equal((await request("/api/products?category=Lighting")).body.data[0].id, 2);
  assert.equal((await request("/api/products?search=stoneware")).body.data.length, 2);

  const created = await request("/api/products", "POST", {
    name: "Woven Basket",
    price: 39.5,
    category: "Decor",
    description: "Handwoven natural fibers",
    image: "https://example.com/basket.jpg",
    unexpected: "stripped"
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.data.id, 9);
  assert.equal("unexpected" in created.body.data, false);
  const id = created.body.data.id;

  const patched = await request(`/api/products/${id}`, "PATCH", { price: 41 });
  assert.equal(patched.status, 200);
  assert.equal(patched.body.data.name, "Woven Basket");
  assert.equal(patched.body.data.price, 41);

  const replaced = await request(`/api/products/${id}`, "PUT", {
    name: "New Basket",
    price: 42,
    category: "Decor",
    description: "Updated description",
    image: "https://example.com/new-basket.jpg"
  });
  assert.equal(replaced.body.data.name, "New Basket");

  assert.equal((await request("/api/products", "POST", { name: "Missing fields" })).status, 400);
  assert.equal((await request(`/api/products/${id}`, "DELETE")).status, 200);
  assert.equal((await request(`/api/products/${id}`)).status, 404);
});

test("cart and orders persist and order submission empties the cart", async () => {
  const cartHeaders = { "x-cart-id": "integration-test-cart" };
  const added = await request("/api/cart", "POST", { productId: 1, quantity: 2 }, cartHeaders);
  assert.equal(added.status, 200);
  assert.equal(added.body.data.subtotal, 56);
  await request("/api/cart/items/1", "PATCH", { quantity: 3 }, cartHeaders);
  assert.equal((await request("/api/cart", "GET", undefined, cartHeaders)).body.data.subtotal, 84);
  assert.equal(
    (await request("/api/cart", "POST", { productId: 999, quantity: 1 }, cartHeaders)).status,
    404
  );

  const customer = {
    firstName: "Amina",
    lastName: "Khan",
    email: "amina@example.com",
    address: "10 Main Street",
    city: "Lahore",
    postalCode: "54000",
    payment: "Pay on delivery"
  };
  const createdOrder = await request("/api/orders", "POST", customer, cartHeaders);
  assert.equal(createdOrder.status, 201);
  assert.equal(createdOrder.body.data.total, 84);
  assert.equal(createdOrder.body.data.status, "received");
  assert.equal((await request("/api/cart", "GET", undefined, cartHeaders)).body.data.items.length, 0);
  assert.equal((await request(`/api/orders/${createdOrder.body.data.id}`)).body.data.id, 1);
  assert.equal((await request("/api/orders")).body.data.length, 1);
  assert.equal((await request("/api/orders", "POST", customer, cartHeaders)).status, 400);

  await stopServer();
  await startServer();
  assert.equal((await request("/api/orders/1")).body.data.customer.email, customer.email);
  assert.equal((await request("/api/products/1")).body.data.name, "Still Form Cup");
});

test("cart quantity, delete behavior, and standard API errors work", async () => {
  const headers = { "x-cart-id": "other-test-cart" };
  await request("/api/cart", "POST", { productId: 2 }, headers);
  assert.equal(
    (await request("/api/cart/items/2", "PATCH", { quantity: 0 }, headers)).body.data.items.length,
    0
  );
  assert.equal(
    (await request("/api/cart/items/2", "DELETE", undefined, headers)).status,
    404
  );
  assert.equal((await request("/missing")).status, 404);

  const malformed = await fetch(`${baseUrl}/api/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{"
  });
  assert.equal(malformed.status, 400);
  assert.match((await malformed.json()).error.message, /Malformed JSON/);
});

test("accounts support signup, login, sessions, and persisted credentials", async () => {
  const credentials = {
    name: "Rina Shah",
    email: "RINA@example.com",
    password: "example-pass-123"
  };
  const signup = await request("/api/auth/signup", "POST", credentials);
  assert.equal(signup.status, 201);
  assert.deepEqual(signup.body.data.user, {
    id: 1,
    name: "Rina Shah",
    email: "rina@example.com"
  });
  assert.match(signup.headers.get("set-cookie"), /HttpOnly/);
  const signupCookie = signup.headers.get("set-cookie").split(";")[0];
  assert.equal(
    (await request("/api/auth/me", "GET", undefined, { Cookie: signupCookie })).body.data.user.email,
    "rina@example.com"
  );
  assert.equal((await request("/api/auth/signup", "POST", credentials)).status, 409);
  assert.equal((await request("/api/auth/signup", "POST", {
    name: "Short Password",
    email: "short@example.com",
    password: "short"
  })).status, 400);
  assert.equal((await request("/api/auth/login", "POST", {
    email: credentials.email,
    password: "wrong-password"
  })).status, 401);

  const logout = await request("/api/auth/logout", "POST", {}, { Cookie: signupCookie });
  assert.equal(logout.status, 200);
  assert.match(logout.headers.get("set-cookie"), /Max-Age=0/);
  assert.equal(
    (await request("/api/auth/me", "GET", undefined, { Cookie: signupCookie })).body.data.user,
    null
  );

  await stopServer();
  await startServer();
  const login = await request("/api/auth/login", "POST", {
    email: credentials.email,
    password: credentials.password
  });
  assert.equal(login.status, 200);
  assert.equal(login.body.data.user.email, "rina@example.com");
  assert.equal("passwordHash" in login.body.data.user, false);
  const loginCookie = login.headers.get("set-cookie").split(";")[0];
  assert.equal(
    (await request("/api/auth/me", "GET", undefined, { Cookie: loginCookie })).body.data.user.name,
    "Rina Shah"
  );
});
