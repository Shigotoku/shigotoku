"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
const auth_1 = require("firebase-admin/auth");
async function requireAuth(req, res, next) {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    try {
        const token = header.slice(7);
        const decoded = await (0, auth_1.getAuth)().verifyIdToken(token);
        req.uid = decoded.uid;
        req.email = decoded.email;
        next();
    }
    catch {
        res.status(401).json({ error: "Invalid token" });
    }
}
