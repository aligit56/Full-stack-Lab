const { promisify } = require("node:util");
const { randomBytes, scrypt, timingSafeEqual } = require("node:crypto");
const ApiError = require("../ApiError");

const scryptAsync = promisify(scrypt);
const PASSWORD_HASH_BYTES = 64;
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

class AuthService {
  constructor(store) {
    this.store = store;
    this.sessions = new Map();
  }

  async signup({ name, email, password }) {
    if (this.store.findUserByEmail(email)) {
      throw ApiError.conflict("An account with this email already exists");
    }
    const salt = randomBytes(16).toString("hex");
    const passwordHash = (await scryptAsync(password, salt, PASSWORD_HASH_BYTES)).toString("hex");
    const user = await this.store.createUser({
      name,
      email,
      passwordSalt: salt,
      passwordHash,
      createdAt: new Date().toISOString()
    });
    return this.createSession(user);
  }

  async login({ email, password }) {
    const user = this.store.findUserByEmail(email);
    if (!user) throw ApiError.unauthorized("Email or password is incorrect");

    const actualHash = await scryptAsync(password, user.passwordSalt, PASSWORD_HASH_BYTES);
    const expectedHash = Buffer.from(user.passwordHash, "hex");
    if (
      expectedHash.length !== actualHash.length ||
      !timingSafeEqual(expectedHash, actualHash)
    ) {
      throw ApiError.unauthorized("Email or password is incorrect");
    }
    return this.createSession(user);
  }

  getSessionUser(token) {
    if (!token) return null;
    const session = this.sessions.get(token);
    if (!session) return null;
    if (session.expiresAt <= Date.now()) {
      this.sessions.delete(token);
      return null;
    }
    const user = this.store.getUserById(session.userId);
    return user ? this.publicUser(user) : null;
  }

  logout(token) {
    if (token) this.sessions.delete(token);
  }

  createSession(user) {
    const token = randomBytes(32).toString("base64url");
    this.sessions.set(token, {
      userId: user.id,
      expiresAt: Date.now() + SESSION_TTL_MS
    });
    return { user: this.publicUser(user), token };
  }

  publicUser(user) {
    return { id: user.id, name: user.name, email: user.email };
  }
}

module.exports = AuthService;
