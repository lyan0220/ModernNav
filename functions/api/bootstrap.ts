import { BootstrapResponse } from "../../src/types";
import { migrateIfNeeded } from "./utils/migration";
import {
  readAllCategories,
  getBootstrapConfig,
  getDefaultCategories,
  getDefaultBackground,
  getDefaultPrefs,
} from "./utils/reads";

interface Env {
  DB?: D1Database;
}

export const onRequestGet = async ({ env }: { env: Env }) => {
  try {
    if (!env.DB) {
      const fallback: BootstrapResponse = {
        categories: getDefaultCategories(),
        background: getDefaultBackground(),
        prefs: getDefaultPrefs(),
        isDefaultCode: true,
        dataVersion: 0,
      };
      return jsonResponse(fallback, 200);
    }

    await migrateIfNeeded(env.DB);

    const [categories, cfg] = await Promise.all([
      readAllCategories(env.DB),
      getBootstrapConfig(env.DB),
    ]);

    const response: BootstrapResponse = {
      categories: categories.length > 0 ? categories : getDefaultCategories(),
      background: cfg.background,
      prefs: cfg.prefs,
      isDefaultCode: cfg.isDefaultCode,
      dataVersion: cfg.dataVersion,
    };
    return jsonResponse(response, 200);
  } catch (error) {
    console.error("Bootstrap API Error:", error);
    return jsonResponse(
      {
        categories: getDefaultCategories(),
        background: getDefaultBackground(),
        prefs: getDefaultPrefs(),
        isDefaultCode: true,
        dataVersion: 0,
        error: "Failed to load configuration, using defaults",
      } as BootstrapResponse,
      500
    );
  }
};

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
