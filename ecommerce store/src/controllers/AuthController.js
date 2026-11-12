const { validateSignup, validateLogin } = require("./validation");

class AuthController {
  constructor(service) {
    this.service = service;
  }

  signup(body) {
    return this.service.signup(validateSignup(body));
  }

  login(body) {
    return this.service.login(validateLogin(body));
  }

  me(token) {
    return this.service.getSessionUser(token);
  }

  logout(token) {
    this.service.logout(token);
  }
}

module.exports = AuthController;
