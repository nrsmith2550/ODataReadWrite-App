import express from "express";
import cors from "cors";
import session from "express-session";
import path from "path";
import { config } from "./config";
import { authRouter } from "./routes/auth";
import { entraRouter } from "./routes/entra";
import { d365Router } from "./routes/d365";
import { syncRouter } from "./routes/sync";
import { requireAuth } from "./middleware/requireAuth";

const app = express();

app.use(
  cors({
    origin: config.clientOrigin,
    credentials: true,
  })
);
app.use(express.json());
app.use(
  session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: config.nodeEnv === "production",
      maxAge: 1000 * 60 * 60 * 8, // 8 hours
    },
  })
);

app.use("/api/auth", authRouter);
app.use("/api/entra", requireAuth, entraRouter);
app.use("/api/d365", requireAuth, d365Router);
app.use("/api/sync", requireAuth, syncRouter);

app.get("/api/health", (_req, res) => res.json({ ok: true }));

if (config.nodeEnv === "production") {
  const clientDist = path.join(__dirname, "../../client/dist");
  app.use(express.static(clientDist));
  app.get("*", (_req, res) => res.sendFile(path.join(clientDist, "index.html")));
}

app.listen(config.port, () => {
  console.log(`Server listening on port ${config.port}`);
});
