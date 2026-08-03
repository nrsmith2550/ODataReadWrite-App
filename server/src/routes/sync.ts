import { Router } from "express";
import { computeCandidates, buildPayload } from "../services/syncService";
import { createSystemUser, extractD365ErrorMessage } from "../services/d365Service";
import { listEntraUsers } from "../services/graphService";
import { CreateResult, D365SystemUser } from "../types";

export const syncRouter = Router();

syncRouter.get("/candidates", async (_req, res) => {
  try {
    const diff = await computeCandidates();
    res.json(diff);
  } catch (err) {
    res.status(502).json({ error: (err as Error).message });
  }
});

interface CreateRequestBody {
  userIds: string[];
  overrides?: Record<string, Partial<D365SystemUser>>;
}

syncRouter.post("/create", async (req, res) => {
  const { userIds, overrides = {} } = (req.body ?? {}) as CreateRequestBody;

  if (!Array.isArray(userIds) || userIds.length === 0) {
    res.status(400).json({ error: "userIds must be a non-empty array" });
    return;
  }

  try {
    const entraUsers = await listEntraUsers();
    const byId = new Map(entraUsers.map((u) => [u.id, u]));

    const results: CreateResult[] = [];

    for (const userId of userIds) {
      const entraUser = byId.get(userId);
      if (!entraUser) {
        results.push({
          entraUserId: userId,
          success: false,
          error: "Entra user not found",
          payload: {},
        });
        continue;
      }

      const payload = { ...buildPayload(entraUser), ...(overrides[userId] ?? {}) };

      try {
        await createSystemUser(payload);
        results.push({ entraUserId: userId, success: true, payload });
      } catch (err) {
        results.push({
          entraUserId: userId,
          success: false,
          error: extractD365ErrorMessage(err),
          payload,
        });
      }
    }

    res.json({ results });
  } catch (err) {
    res.status(502).json({ error: (err as Error).message });
  }
});
