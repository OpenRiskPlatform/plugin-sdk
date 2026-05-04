import { dataModelV002 } from "@model/data-model-v0.0.2.ts";
import { SITE_BASE } from "../../site.config.ts";

export const siteBase = SITE_BASE;

const v = dataModelV002.version;

export const dataModelSchemaUrl = `${SITE_BASE}/schemas/data-model-v${v}.schema.json`;
export const manifestSchemaUrl = `${SITE_BASE}/schemas/plugin-manifest-v${v}.schema.json`;
