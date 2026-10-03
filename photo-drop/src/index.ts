import express, { NextFunction, Request, Response } from "express";
import cookieSession from "cookie-session";
import rateLimit from "express-rate-limit";
import multer from "multer";
import path from "path";
import Stripe from "stripe";
import { google } from "googleapis";
import { config } from "./config";
import { db, getUserById, getUserBySub, getUserByToken, User } from "./db";
import { encrypt, randomToken } from "./crypto";
import { authUrl, createFolder, listFolder, oauthClient, uploadToFolder } from "./google";

const stripe = new Stripe(config.stripe.secretKey);
const app = express();
app.set("trust proxy", 1);

const markPaid = db.prepare(
  "UPDATE users SET paid = 1, stripe_session_id = ? WHERE id = ?"
);

// --- Stripe webhook (raw body; must be registered before express.json) ---------
app.post("/webhooks/stripe", express.raw({ type: "application/json" }), (req, res) => {
  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      req.headers["stripe-signature"] as string,
      config.stripe.webhookSecret
    );
    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      const s = event.data.object as Stripe.Checkout.Session;
      if (s.payment_status === "paid" && s.client_reference_id) {
        markPaid.run(s.id, Number(s.client_reference_id));
      }
    }
    res.json({ received: true });
  } catch (e) {
    res.status(400).send(`Webhook error: ${(e as Error).message}`);
  }
});

app.use(express.json());
app.use(
  cookieSession({
    name: "pd",
    secret: config.sessionSecret,
    maxAge: 30 * 24 * 3600 * 1000,
    httpOnly: true,
    sameSite: "lax",
    secure: config.isProd,
  })
);

// --- helpers ------------------------------------------------------------------
declare module "express-serve-static-core" {
  interface Request {
    user?: User;
  }
}

function requireUser(req: Request, res: Response, next: NextFunction) {
  const u = req.session?.uid ? getUserById(req.session.uid) : undefined;
  if (!u) return res.status(401).json({ error: "Not signed in" });
  req.user = u;
  next();
}
function requirePaid(req: Request, res: Response, next: NextFunction) {
  if (!req.user!.paid) return res.status(402).json({ error: "Payment required" });
  next();
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxUploadMb * 1024 * 1024, files: 10 },
  fileFilter: (_req, f, cb) =>
    cb(null, f.mimetype.startsWith("image/") || f.mimetype.startsWith("video/")),
});

const view = (u: User) => ({
  email: u.email,
  paid: !!u.paid,
  folderName: u.folder_name,
  uploadUrl: u.folder_id ? `${config.baseUrl}/u/${u.upload_token}` : null,
});

// --- Google sign-in -----------------------------------------------------------
app.get("/auth/google", (req, res) => {
  const state = randomToken();
  req.session!.oauthState = state;
  res.redirect(authUrl(state));
});

app.get("/auth/google/callback", async (req, res) => {
  try {
    if (!req.query.code || req.query.state !== req.session?.oauthState) {
      return res.status(400).send("Sign-in failed. Please try again.");
    }
    const client = oauthClient();
    const { tokens } = await client.getToken(String(req.query.code));
    client.setCredentials(tokens);
    const info = await google.oauth2({ version: "v2", auth: client }).userinfo.get();
    const sub = info.data.id!;
    const email = info.data.email ?? "";

    let user = getUserBySub(sub);
    if (!user) {
      db.prepare(
        "INSERT INTO users (google_sub, email, upload_token) VALUES (?, ?, ?)"
      ).run(sub, email, randomToken());
      user = getUserBySub(sub)!;
    }
    if (tokens.refresh_token) {
      db.prepare("UPDATE users SET refresh_token_enc = ?, email = ? WHERE id = ?").run(
        encrypt(tokens.refresh_token), email, user.id
      );
    }
    req.session = { uid: user.id };
    res.redirect("/app");
  } catch (e) {
    console.error(e);
    res.status(500).send("Sign-in failed. Please try again.");
  }
});

app.post("/auth/logout", (req, res) => {
  req.session = null;
  res.json({ ok: true });
});

// --- Account / payment --------------------------------------------------------
app.get("/api/me", requireUser, (req, res) => res.json(view(req.user!)));

app.post("/api/checkout", requireUser, async (req, res) => {
  if (req.user!.paid) return res.json({ url: `${config.baseUrl}/app` });
  const s = await stripe.checkout.sessions.create({
    mode: "payment",
    client_reference_id: String(req.user!.id),
    customer_email: req.user!.email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: config.stripe.currency,
          unit_amount: config.stripe.priceCents,
          product_data: { name: "Photo Drop — lifetime access" },
        },
      },
    ],
    success_url: `${config.baseUrl}/app?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${config.baseUrl}/app`,
  });
  res.json({ url: s.url });
});

// Fallback so access unlocks on return from Stripe even if the webhook is late/not configured.
app.post("/api/checkout/confirm", requireUser, async (req, res) => {
  const id = String(req.body?.sessionId ?? "");
  const s = await stripe.checkout.sessions.retrieve(id);
  if (s.payment_status === "paid" && s.client_reference_id === String(req.user!.id)) {
    markPaid.run(s.id, req.user!.id);
  }
  res.json(view(getUserById(req.user!.id)!));
});

// --- Folder + uploads ---------------------------------------------------------
app.post("/api/folder", requireUser, requirePaid, async (req, res) => {
  const name = String(req.body?.name ?? "").trim().slice(0, 100);
  if (!name) return res.status(400).json({ error: "Folder name required" });
  if (req.user!.folder_id) return res.status(409).json({ error: "Folder already created" });
  const f = await createFolder(req.user!, name);
  db.prepare("UPDATE users SET folder_id = ?, folder_name = ? WHERE id = ?").run(
    f.id, f.name, req.user!.id
  );
  res.json(view(getUserById(req.user!.id)!));
});

app.get("/api/files", requireUser, requirePaid, async (req, res) => {
  if (!req.user!.folder_id) return res.json([]);
  res.json(await listFolder(req.user!));
});

app.post("/api/upload", requireUser, requirePaid, upload.array("files"), async (req, res) => {
  if (!req.user!.folder_id) return res.status(400).json({ error: "Create a folder first" });
  const files = (req.files as Express.Multer.File[]) ?? [];
  const out = [];
  for (const f of files) out.push(await uploadToFolder(req.user!, f));
  res.json({ uploaded: out.length });
});

app.post("/api/rotate-link", requireUser, requirePaid, (req, res) => {
  db.prepare("UPDATE users SET upload_token = ? WHERE id = ?").run(randomToken(), req.user!.id);
  res.json(view(getUserById(req.user!.id)!));
});

// --- Public guest upload (the "landing page" use case) -------------------------
const guestLimiter = rateLimit({ windowMs: 60_000, limit: 30 });

app.get("/api/guest/:token", guestLimiter, (req, res) => {
  const u = getUserByToken(String(req.params.token));
  if (!u || !u.paid || !u.folder_id) return res.status(404).json({ error: "Not found" });
  res.json({ title: u.folder_name });
});

app.post("/api/guest/:token", guestLimiter, upload.array("files"), async (req, res) => {
  const u = getUserByToken(String(req.params.token));
  if (!u || !u.paid || !u.folder_id) return res.status(404).json({ error: "Not found" });
  const files = (req.files as Express.Multer.File[]) ?? [];
  for (const f of files) await uploadToFolder(u, f);
  res.json({ uploaded: files.length });
});

// --- Pages --------------------------------------------------------------------
const pub = path.join(__dirname, "../public");
app.use(express.static(pub, { index: "index.html" }));
app.get("/app", (_req, res) => res.sendFile(path.join(pub, "app.html")));
app.get("/u/:token", (_req, res) => res.sendFile(path.join(pub, "upload.html")));

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  const status = err instanceof multer.MulterError ? 413 : 500;
  res.status(status).json({ error: status === 413 ? "File too large" : "Something went wrong" });
});

app.listen(config.port, () => console.log(`Photo Drop on ${config.baseUrl}`));
