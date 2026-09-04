// src/modules/auth/index.js
// No other module needs to call into auth's service layer yet — the
// `authenticate` middleware verifies tokens directly via src/utils/tokens.js
// rather than going through this module, since token verification is a
// stateless, cross-cutting concern rather than an auth-module business
// operation. This file exists to keep the module-boundary convention
// consistent and ready for a future export (e.g. a `revokeAllUserSessions`
// call from an admin module) without restructuring later.
module.exports = {};