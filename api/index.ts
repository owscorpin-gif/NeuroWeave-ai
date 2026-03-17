import express from "express";
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
import { authenticate, authorize } from "../server/middleware/auth";
import { networkSecurity } from "../server/middleware/networkSecurity";
import slowDown from "express-slow-down";

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
  if (!admin.apps.length) {
    admin.initializeApp({
      projectId: firebaseConfig.projectId,
      credential: firebaseConfig.privateKey ? admin.credential.cert(firebaseConfig as any) : undefined,
    });
  }
} else {
  if (!admin.apps.length) {
    admin.initializeApp();
  }
}

const db = admin.firestore();

const app = express();

// 1. Security Headers
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
  xssFilter: true,
  noSniff: true,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
}));

app.use(cookieParser());

// 2. Session & CSRF
app.use(session({
  secret: process.env.SESSION_SECRET || "neuroweave-secret-key-123",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    maxAge: 3600000
  }
}));

app.use(lusca.csrf({
  cookie: {
    name: "_csrf",
    options: {
      httpOnly: false,
      secure: true,
      sameSite: "none"
    }
  }
}));

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
  res.json({ csrfToken: (req as any).csrfToken() });
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
