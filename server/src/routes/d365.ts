import { Router } from "express";
import { extractD365ErrorMessage, getMetadataXml, listSystemUsers } from "../services/d365Service";

export const d365Router = Router();

d365Router.get("/system-users", async (_req, res) => {
  try {
    const users = await listSystemUsers();
    res.json({ users });
  } catch (err) {
    res.status(502).json({ error: extractD365ErrorMessage(err) });
  }
});

// Raw $metadata passthrough so an admin can look up the real field names
// for their SystemUsers entity when customizing D365_FIELD_MAPPING_JSON.
d365Router.get("/metadata", async (_req, res) => {
  try {
    const xml = await getMetadataXml();
    res.type("application/xml").send(xml);
  } catch (err) {
    res.status(502).json({ error: extractD365ErrorMessage(err) });
  }
});
