# OpenRisk Plugin SDK

Canonical developer materials for writing OpenRisk plugins.

Current data model version: `0.0.2`.

This repository is intentionally simple. OpenRisk plugins are single TypeScript
files executed without bundling, so the supported integration path is to inline
[`model/openrisk-types.ts`](model/openrisk-types.ts) into a plugin file.

## Contents

- `model/data-model-v0.0.2.ts` - structured source of truth for data model `0.0.2`
- `model/openrisk-types.ts` - canonical inline TypeScript helper for single-file plugins
- `schemas/data-model-v0.0.2.schema.json` - generated JSON Schema for plugin output arrays
- `examples/` - generated valid output examples
- `src/content/docs/` - generated and hand-authored Starlight documentation

## Development

```bash
npm install
npm run generate
npm run dev
```

Build the static site:

```bash
npm run build
```

## Contract

Plugins that return OpenRisk data model results return a JSON array of flat
entities. Each entity contains:

- `$modelVersion: "0.0.2"`
- `$entity`, for example `entity.person`
- `$id`, stable inside the source namespace
- optional `$props`, a flat map of typed-value arrays
- optional `$extra`, a flat array of `key-value` typed values
- optional `$sources`

Legacy v1 plugins that omit `$modelVersion` are migrated by current OpenRisk
backend builds to `0.0.2` at scan result serialization time.
