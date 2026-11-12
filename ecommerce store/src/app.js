const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { URL } = require("node:url");
const ApiError = require("./ApiError");
const { createStoreModule } = require("./modules/storeModule");

const MAX_BODY_SIZE = 64 * 1024;
const AUTH_COOKIE_NAME = "morrow_session";
const staticFiles = {
  "/": ["index.html", "text/html; charset=utf-8"],
  "/index.html": ["index.html", "text/html; charset=utf-8"],
  "/style.css": ["style.css", "text/css; charset=utf-8"],
  "/store.js": ["store.js", "text/javascript; charset=utf-8"]
};

function readJsonBody(request) {
  const contentLength = Number(request.headers["content-length"]);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_SIZE) {
    request.resume();
    return Promise.reject(new ApiError(413, "Request body exceeds 64KB limit"));
  }
  if ((request.headers["content-type"] || "").split(";")[0].trim().toLowerCase() !== "application/json") {
    request.resume();
    return Promise.reject(ApiError.badRequest("Content-Type must be application/json"));
  }
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let settled = false;
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_SIZE) {
        settled = true;
        request.resume();
        reject(new ApiError(413, "Request body exceeds 64KB limit"));
      } else {
        chunks.push(chunk);
      }
    });
    request.on("end", () => {
      if (settled) return;
      try {
        const text = Buffer.concat(chunks).toString("utf8");
        if (!text.trim()) throw ApiError.badRequest("Request body cannot be empty");
        resolve(JSON.parse(text));
      } catch (error) {
        reject(error instanceof SyntaxError
          ? ApiError.badRequest("Malformed JSON request body")
          : error);
      }
    });
    request.on("error", (error) => {
      if (!settled) reject(error);
    });
  });
}

function parseId(value) {
  if (!/^[1-9]\d*$/.test(value)) throw ApiError.badRequest("ID must be a positive integer");
  const id = Number(value);
  if (!Number.isSafeInteger(id)) throw ApiError.badRequest("ID must be a safe integer");
  return id;
}

function getCartId(request) {
  const cartId = request.headers["x-cart-id"] || "default";
  if (typeof cartId !== "string" || !/^[a-zA-Z0-9_-]{1,80}$/.test(cartId)) {
    throw ApiError.badRequest("x-cart-id must contain 1-80 letters, numbers, underscores, or hyphens");
  }
  return cartId;
}

function sendJson(response, status, data, headers = {}) {
  const body = JSON.stringify(data);
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    ...headers
  });
  response.end(body);
}

function getAuthToken(request) {
  const cookies = (request.headers.cookie || "").split(";");
  const sessionCookie = cookies.map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${AUTH_COOKIE_NAME}=`));
  return sessionCookie ? sessionCookie.slice(AUTH_COOKIE_NAME.length + 1) : undefined;
}

function authCookie(token, { clear = false } = {}) {
  const parts = [
    `${AUTH_COOKIE_NAME}=${clear ? "" : token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${clear ? 0 : 7 * 24 * 60 * 60}`
  ];
  if (process.env.NODE_ENV === "production") parts.push("Secure");
  return parts.join("; ");
}

function serveStatic(pathname, response) {
  const file = staticFiles[pathname];
  if (!file) return false;
  const content = fs.readFileSync(path.join(__dirname, "..", file[0]));
  response.writeHead(200, {
    "Content-Type": file[1],
    "Content-Length": content.length
  });
  response.end(content);
  return true;
}

function createApp({ store } = {}) {
  const controllers = createStoreModule({ store });
  return http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, "http://localhost");
      if (request.method === "GET" && serveStatic(url.pathname, response)) return;

      const segments = url.pathname.split("/").filter(Boolean);
      if (segments[0] !== "api") throw ApiError.notFound("Route not found");
      const resource = segments[1];

      if (resource === "auth" && segments.length === 3 && segments[2] === "signup" && request.method === "POST") {
        const session = await controllers.auth.signup(await readJsonBody(request));
        sendJson(response, 201, { data: { user: session.user } }, {
          "Set-Cookie": authCookie(session.token)
        });
        return;
      }

      if (resource === "auth" && segments.length === 3 && segments[2] === "login" && request.method === "POST") {
        const session = await controllers.auth.login(await readJsonBody(request));
        sendJson(response, 200, { data: { user: session.user } }, {
          "Set-Cookie": authCookie(session.token)
        });
        return;
      }

      if (resource === "auth" && segments.length === 3 && segments[2] === "me" && request.method === "GET") {
        sendJson(response, 200, {
          data: { user: controllers.auth.me(getAuthToken(request)) }
        });
        return;
      }

      if (resource === "auth" && segments.length === 3 && segments[2] === "logout" && request.method === "POST") {
        controllers.auth.logout(getAuthToken(request));
        sendJson(response, 200, { data: { message: "Signed out" } }, {
          "Set-Cookie": authCookie("", { clear: true })
        });
        return;
      }

      if (resource === "products" && segments.length === 2) {
        if (request.method === "GET") {
          const products = controllers.products.list({
            category: url.searchParams.get("category") || undefined,
            search: url.searchParams.get("search") || undefined
          });
          sendJson(response, 200, { data: products });
          return;
        }
        if (request.method === "POST") {
          const product = await controllers.products.create(await readJsonBody(request));
          sendJson(response, 201, { data: product });
          return;
        }
      }

      if (resource === "products" && segments.length === 3) {
        const id = parseId(segments[2]);
        if (request.method === "GET") {
          const product = controllers.products.get(id);
          sendJson(response, 200, { data: product });
          return;
        }
        if (request.method === "PUT" || request.method === "PATCH") {
          const product = await controllers.products.update(id, await readJsonBody(request), {
            replace: request.method === "PUT"
          });
          sendJson(response, 200, { data: product });
          return;
        }
        if (request.method === "DELETE") {
          sendJson(response, 200, { data: await controllers.products.delete(id) });
          return;
        }
      }

      if (resource === "cart" && segments.length === 2) {
        const cartId = getCartId(request);
        if (request.method === "GET") {
          sendJson(response, 200, { data: controllers.cart.get(cartId) });
          return;
        }
        if (request.method === "POST") {
          sendJson(response, 200, {
            data: await controllers.cart.addItem(cartId, await readJsonBody(request))
          });
          return;
        }
      }

      if (resource === "cart" && segments[2] === "items" && segments.length === 4) {
        const cartId = getCartId(request);
        const productId = parseId(segments[3]);
        if (request.method === "PATCH") {
          sendJson(response, 200, {
            data: await controllers.cart.setQuantity(cartId, productId, await readJsonBody(request))
          });
          return;
        }
        if (request.method === "DELETE") {
          sendJson(response, 200, {
            data: await controllers.cart.removeItem(cartId, productId)
          });
          return;
        }
      }

      if (resource === "orders" && segments.length === 2) {
        if (request.method === "GET") {
          sendJson(response, 200, { data: controllers.orders.list() });
          return;
        }
        if (request.method === "POST") {
          const order = await controllers.orders.create(getCartId(request), await readJsonBody(request));
          sendJson(response, 201, { data: order });
          return;
        }
      }

      if (resource === "orders" && segments.length === 3 && request.method === "GET") {
        const order = controllers.orders.get(parseId(segments[2]));
        sendJson(response, 200, { data: order });
        return;
      }

      throw ApiError.notFound("Route not found");
    } catch (error) {
      const status = Number.isInteger(error.status) ? error.status : 500;
      if (status === 500) console.error(error);
      if (!response.headersSent) {
        sendJson(response, status, {
          error: { message: status === 500 ? "Internal server error" : error.message }
        });
      } else {
        response.destroy();
      }
    }
  });
}

module.exports = { createApp, MAX_BODY_SIZE };
