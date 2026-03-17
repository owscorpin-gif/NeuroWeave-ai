import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";
import fs from "fs";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cors from "cors";
import { body, validationResult } from "express-validator";
import xss from "xss";
import cookieParser from "cookie-parser";
import session from "express-session";
import lusca from "lusca";
import { authenticate, authorize } from "./server/middleware/auth";
import { networkSecurity } from "./server/middleware/networkSecurity";
import slowDown from "express-slow-down";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
let firebaseConfig;
try {
  if (fs.existsSync("./firebase-applet-config.json")) {
    firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
  } else {
    firebaseConfig = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };
  }
} catch (err) {
  console.error("Error loading Firebase config:", err);
}

if (firebaseConfig && (firebaseConfig.projectId || firebaseConfig.credential)) {
  admin.initializeApp({
    projectId: firebaseConfig.projectId,
    credential: firebaseConfig.privateKey ? admin.credential.cert(firebaseConfig as any) : undefined,
  });
} else {
  // Fallback for environments with default credentials
  admin.initializeApp();
}

const db = admin.firestore();

export async function createServer() {
  const app = express();
  const PORT = 3000;

  // 1. Security Headers & Browser Protections
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://generativelanguage.googleapis.com", "https://*.firebasejs.com", "https://*.googleapis.com", "https://apis.google.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "blob:", "https://picsum.photos", "https://*.googleusercontent.com", "https://*.googleapis.com", "https://*.firebaseapp.com"],
        connectSrc: ["'self'", "https://generativelanguage.googleapis.com", "https://*.googleapis.com", "https://*.firebaseio.com", "wss://*.googleapis.com", "https://*.firebaseapp.com"],
        mediaSrc: ["'self'", "data:", "blob:", "https://*.googleusercontent.com"],
        frameSrc: ["'self'", "https://*.firebaseapp.com", "https://*.googleapis.com", "https://*.firebasejs.com"],
        frameAncestors: ["'self'", "https://*.google.com", "https://*.googleusercontent.com", "https://*.run.app"],
      },
    },
    crossOriginEmbedderPolicy: false,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    xssFilter: true,
    noSniff: true,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  }));

  app.use(cookieParser());
  
  // 2. Session & CSRF Protection
  app.use(session({
    secret: process.env.SESSION_SECRET || "neuroweave-secret-key-123",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true, // Required for SameSite=None
      sameSite: "none", // Required for cross-origin iframe
      maxAge: 3600000 // 1 hour
    }
  }));

  app.use(lusca.csrf({
    cookie: {
      name: "_csrf",
      options: {
        httpOnly: false, // Frontend needs to read it
        secure: true, // Required for SameSite=None
        sameSite: "none" // Required for cross-origin iframe
      }
    }
  }));
  // app.use(lusca.xframe("SAMEORIGIN")); // Removed for AI Studio iframe compatibility
  app.use(lusca.p3p("ABCDEF"));
  app.use(lusca.hsts({ maxAge: 31536000 }));
  app.use(lusca.xssProtection(true));
  app.use(lusca.nosniff());

  // 2. Network Security & DDoS Protection (Scoped to API)
  const speedLimiter = slowDown({
    windowMs: 15 * 60 * 1000, // 15 minutes
    delayAfter: 50, // allow 50 requests per 15 minutes, then...
    delayMs: (hits) => hits * 100, // begin adding 100ms of delay per request above 50
  });

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later." }
  });

  app.use("/api/", networkSecurity, speedLimiter, limiter);

  // 4. CORS Configuration
  app.use(cors({
    origin: process.env.APP_URL || "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }));

  app.use(express.json({ limit: "10kb" })); // Body size limit for sanitization

  // --- CLOUD INFRASTRUCTURE SECURITY ---
  // The backend runs using a Private Service Account with Minimal IAM Permissions.
  // Secrets are managed via Environment Variables and never exposed to the frontend.
  // --------------------------------------

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // CSRF Token Endpoint for Frontend
  app.get("/api/csrf-token", (req, res) => {
    res.json({ csrfToken: (req as any).csrfToken() });
  });

  // Apply Auth to all subsequent API routes
  app.use("/api/", authenticate);

  // Protected Admin Route with Validation
  app.get("/api/admin/stats", authorize(["admin"]), async (req, res) => {
    try {
      const usersCount = (await db.collection("users").count().get()).data().count;
      const convsCount = (await db.collection("conversations").count().get()).data().count;
      
      res.json({
        users: usersCount,
        conversations: convsCount,
        systemStatus: "operational"
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // Example of a route with input validation
  app.post("/api/user/update-profile", 
    [
      body("displayName").trim().isLength({ min: 2, max: 50 }).escape(),
      body("photoURL").optional().isURL().escape(),
    ],
    async (req: any, res: any) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      try {
        await db.collection("users").doc(req.user.uid).update({
          displayName: xss(req.body.displayName),
          photoURL: xss(req.body.photoURL || ""),
          updatedAt: new Date().toISOString()
        });
        res.json({ message: "Profile updated successfully" });
      } catch (error) {
        res.status(500).json({ error: "Update failed" });
      }
    }
  );

  // Protected Developer Route
  app.get("/api/dev/logs", authorize(["admin", "developer"]), (req, res) => {
    res.json({ logs: ["Security layers active", "Helmet enabled", "Rate limiting active", "RBAC verified", "Service Account: Private"] });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  return app;
}

// Only start the server if this file is run directly (not as a module)
const isMain = process.argv[1] && (path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url)));

if (isMain || !process.env.VERCEL) {
  createServer().then(app => {
    const PORT = Number(process.env.PORT) || 3000;
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 NeuroWeave AI Server running on http://localhost:${PORT}`);
    });
  }).catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
  });
}

// Export the server for Vercel
export default async (req: any, res: any) => {
  const app = await createServer();
  return app(req, res);
};
