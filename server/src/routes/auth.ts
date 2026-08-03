import { Router } from "express";
import { config } from "../config";

export const authRouter = Router();

authRouter.post("/login", (req, res) => {
  const { password } = req.body ?? {};

  if (!config.appAccessPassword) {
    res.status(500).json({
      error:
        "APP_ACCESS_PASSWORD is not configured on the server. See README for setup.",
    });
    return;
  }

  if (password !== config.appAccessPassword) {
    res.status(401).json({ error: "Incorrect password" });
    return;
  }

  req.session.authenticated = true;
  res.json({ ok: true });
});

authRouter.post("/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

authRouter.get("/me", (req, res) => {
  res.json({ authenticated: Boolean(req.session?.authenticated) });
});
