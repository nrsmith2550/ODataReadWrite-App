import { Router } from "express";
import { listEntraUsers } from "../services/graphService";

export const entraRouter = Router();

entraRouter.get("/users", async (_req, res) => {
  try {
    const users = await listEntraUsers();
    res.json({ users });
  } catch (err) {
    res.status(502).json({ error: (err as Error).message });
  }
});
