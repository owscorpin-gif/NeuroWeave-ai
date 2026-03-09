import { Request, Response, NextFunction } from "express";
import admin from "firebase-admin";

/**
 * Middleware to verify Firebase ID tokens and attach user info to the request.
 * This ensures that only authenticated users can access protected API routes.
 */
export const authenticate = async (req: any, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: Missing or invalid token" });
  }

  const idToken = authHeader.split("Bearer ")[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error("Authentication Error:", error);
    res.status(401).json({ error: "Unauthorized: Invalid token" });
  }
};

/**
 * Middleware to enforce role-based access control (RBAC).
 * Requires the 'authenticate' middleware to be run first.
 */
export const authorize = (allowedRoles: string[]) => {
  return async (req: any, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized: User not authenticated" });
    }

    try {
      const userDoc = await admin.firestore().collection("users").doc(req.user.uid).get();
      const userData = userDoc.data();
      const userRole = userData?.role || "user";

      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({ error: "Forbidden: Insufficient permissions" });
      }

      req.user.role = userRole;
      next();
    } catch (error) {
      console.error("Authorization Error:", error);
      res.status(500).json({ error: "Internal Server Error during authorization" });
    }
  };
};
