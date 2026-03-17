import express from "express";
import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cors from "cors";
import { body, validationResult } from "express-validator";
import xss from "xss";
import cookieParser from "cookie-parser";
import session from "express-session";
import lusca from "lusca";
import { authenticate, authorize } from "../server/middleware/auth";
import { networkSecurity } from "../server/middleware/networkSecurity";
import slowDown from "express-slow-down";

// Initialize Firebase Admin
let firebaseConfig: any = {};
const configPath = path.join(process.cwd(), "firebase-applet-config.json");
try {
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
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

if (!admin.apps.length) {
  try {
    console.log("Environment check:", {
      hasProjectId: !!firebaseConfig.projectId,
      hasClientEmail: !!firebaseConfig.clientEmail,
      hasPrivateKey: !!firebaseConfig.privateKey,
      nodeEnv: process.env.NODE_ENV
    });
    if (firebaseConfig.projectId && firebaseConfig.clientEmail && firebaseConfig.privateKey) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: firebaseConfig.projectId,
          clientEmail: firebaseConfig.clientEmail,
          privateKey: firebaseConfig.privateKey,
        }),
      });
      console.log("Firebase Admin initialized with service account");
    } else if (firebaseConfig.projectId) {
      admin.initializeApp({
        projectId: firebaseConfig.projectId,
      });
      console.log("Firebase Admin initialized with projectId only");
    } else {
      admin.initializeApp();
      console.log("Firebase Admin initialized with default credentials");
    }
  } catch (initErr) {
    console.error("Firebase Admin initialization failed:", initErr);
  }
}

const db = admin.firestore();

const app = express();

// 1. Security Headers - Relaxed for Vercel deployment
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for now to rule it out
  crossOriginEmbedderPolicy: false,
}));

app.use(cookieParser());

// 2. Session & CSRF - Simplified for Vercel (stateless environment)
app.use(session({
  secret: process.env.SESSION_SECRET || "neuroweave-secret-key-123",
  resave: false,
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
    secure: true,
    sameSite: "lax", // Changed from none to lax
    maxAge: 3600000
  }
}));

// Disable CSRF for Vercel to avoid session persistence issues
// app.use(lusca.csrf({ ... }));

app.use(lusca.p3p("ABCDEF"));
app.use(lusca.xssProtection(true));
app.use(lusca.nosniff());

// 3. Network Security
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 50,
  delayMs: (hits) => hits * 100,
});

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." }
});

app.use("/api/", networkSecurity, speedLimiter, limiter);

// 4. CORS
app.use(cors({
  origin: true, // Allow all origins in serverless mode, or specify your Vercel URL
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json({ limit: "10kb" }));

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString(), env: "vercel" });
});

app.get("/api/csrf-token", (req, res) => {
  // Return a dummy token if CSRF is disabled for Vercel
  const token = (req as any).csrfToken ? (req as any).csrfToken() : "disabled";
  res.json({ csrfToken: token });
});

app.use("/api/", authenticate);

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

export default app;
