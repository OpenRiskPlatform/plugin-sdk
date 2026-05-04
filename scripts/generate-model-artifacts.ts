import { mkdir, writeFile, copyFile, readdir } from "node:fs/promises";
import { dataModelV002 } from "../model/data-model-v0.0.2.ts";
import type { EntitySpec, PropertySpec, TypedValueKind, TypedValueSpec } from "../model/define-model.ts";
import { SITE_BASE } from "../site.config.ts";

const root = new URL("../", import.meta.url);

const currentModel = dataModelV002;

function path(name: string) {
  return new URL(name, root);
}

function stableJson(value: unknown) {
  return JSON.stringify(value, null, 2) + "\n";
}

function slugEntity(id: string) {
  return id.replace(/^entity\./, "");
}

function scalarToTypedValue(prop: PropertySpec, value: unknown) {
  const type = prop.types[0];
  if (type === "key-value") {
    return null;
  }
  return { $type: type, value };
}

function entityExample(entity: EntitySpec, variant: "minimal" | "common" | "full") {
  const values = entity.examples[variant];
  const props: Record<string, unknown[]> = {};
  const extra = [];

  for (const [propName, rawValue] of Object.entries(values)) {
    const prop = entity.props[propName];
    if (!prop) continue;
    const rawItems = Array.isArray(rawValue) ? rawValue : [rawValue];

    if (prop.types[0] === "key-value") {
      for (const item of rawItems) {
        extra.push({
          $type: "key-value",
          value: {
            key: { $type: "string", value: propName },
            value: { $type: "string", value: String(item) },
          },
        });
      }
      continue;
    }

    props[propName] = rawItems
      .map((item) => scalarToTypedValue(prop, item))
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
  }

  const output: Record<string, unknown> = {
    $modelVersion: currentModel.version,
    $entity: entity.id,
    $id: `example:${slugEntity(entity.id)}`,
    $props: props,
  };

  if (extra.length) output.$extra = extra;
  return [output];
}

function valueSchemaFor(type: TypedValueSpec) {
  const base =
    type.jsonType === "object"
      ? { type: "object" as const }
      : { type: type.jsonType };

  if (type.allowedValues && type.allowedValues.length > 0) {
    return {
      ...base,
      enum: [...type.allowedValues],
    };
  }

  return base;
}

function schemaForModel() {
  const typedValueKinds = Object.keys(currentModel.typedValues).filter((kind) => kind !== "key-value");
  const typedValueDefs = typedValueKinds.map((kind) => {
    const type = currentModel.typedValues[kind as TypedValueKind];
    return {
      type: "object",
      required: ["$type", "value"],
      properties: {
        $type: { const: kind },
        value: valueSchemaFor(type),
      },
      additionalProperties: false,
    };
  });

  return {
    $schema: "http://json-schema.org/draft-07/schema#",
    $id: `${SITE_BASE}/schemas/data-model-v${currentModel.version}.schema.json`,
    title: `OpenRisk Data Model ${currentModel.version} Result`,
    description: currentModel.description,
    type: "array",
    items: { $ref: "#/definitions/DataModelEntity" },
    definitions: {
      DataModelEntity: {
        type: "object",
        required: ["$modelVersion", "$entity", "$id"],
        properties: {
          $modelVersion: { const: currentModel.version },
          $entity: { enum: Object.keys(currentModel.entities) },
          $id: { type: "string", minLength: 1 },
          $sources: {
            type: "array",
            items: { $ref: "#/definitions/SourceDescriptor" },
          },
          $props: {
            type: "object",
            additionalProperties: {
              type: "array",
              items: { $ref: "#/definitions/TypedValue" },
            },
          },
          $extra: {
            type: "array",
            items: { $ref: "#/definitions/KeyValue" },
          },
        },
        additionalProperties: true,
      },
      SourceDescriptor: {
        type: "object",
        required: ["name", "source"],
        properties: {
          name: { type: "string", minLength: 1 },
          source: { type: "string", minLength: 1 },
        },
        additionalProperties: false,
      },
      TypedValue: {
        oneOf: [...typedValueDefs, { $ref: "#/definitions/KeyValue" }],
      },
      KeyValue: {
        type: "object",
        required: ["$type", "value"],
        properties: {
          $type: { const: "key-value" },
          value: {
            type: "object",
            required: ["key", "value"],
            properties: {
              key: {
                type: "object",
                required: ["$type", "value"],
                properties: {
                  $type: { const: "string" },
                  value: { type: "string" },
                },
                additionalProperties: false,
              },
              value: { $ref: "#/definitions/TypedValue" },
            },
            additionalProperties: false,
          },
        },
        additionalProperties: false,
      },
    },
  };
}

function mdxValue(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function entityPage(entity: EntitySpec) {
  const examples = {
    minimal: entityExample(entity, "minimal"),
    common: entityExample(entity, "common"),
    full: entityExample(entity, "full"),
  };

  return `---
title: ${JSON.stringify(entity.label)}
description: ${JSON.stringify(entity.description)}
---

import EntitySummary from "../../../../components/EntitySummary.astro";
import PropertyTable from "../../../../components/PropertyTable.astro";
import { ExampleViewer } from "../../../../components/react/ExampleViewer";

<EntitySummary entity={${mdxValue(entity)}} />

<PropertyTable entity={${mdxValue(entity)}} typedValues={${mdxValue(currentModel.typedValues)}} />

<ExampleViewer client:load examples={${mdxValue(examples)}} />
`;
}

function typeIndexPage() {
  const cards = Object.entries(currentModel.typedValues)
    .map(
      ([id, type]) => `<a class="or-type-card" href="./${id}/">
  <h2>${type.label}</h2>
  <p>${type.description}</p>
  <code>${id}</code>
</a>`,
    )
    .join("\n");

  return `---
title: Typed values
description: Typed value primitives supported by OpenRisk data model ${currentModel.version}.
---

<p class="or-lede">Typed values make plugin output machine-readable while keeping entity properties flat.</p>

<div class="or-type-directory">
${cards}
</div>
`;
}

function typePage(id: TypedValueKind) {
  const type = currentModel.typedValues[id];
  return `---
title: ${JSON.stringify(type.label)}
description: ${JSON.stringify(type.description)}
---

<p class="or-kicker">Typed value</p>

# ${type.label}

<p class="or-lede">${type.description}</p>

${type.detail}

## Wire shape

\`\`\`json
${JSON.stringify({ $type: id, value: type.examples[0] }, null, 2)}
\`\`\`

## Examples

${type.examples.map((example) => `- \`${JSON.stringify(example)}\``).join("\n")}
`;
}

function modelIndexPage() {
  const entities = Object.values(currentModel.entities);
  const schema = schemaForModel();

  return `---
title: Data Model ${currentModel.version}
description: ${JSON.stringify(currentModel.description)}
---

import { ModelExplorer } from "../../../components/react/ModelExplorer";
import { ValidationPlayground } from "../../../components/react/ValidationPlayground";

<p class="or-kicker">Version ${currentModel.version}</p>

# ${currentModel.title}

<p class="or-lede">${currentModel.description}</p>

<ModelExplorer client:load entities={${mdxValue(entities)}} />

<ValidationPlayground client:load schema={${mdxValue(schema)}} />
`;
}

function overviewGuide() {
  return `---
title: Overview
description: Build OpenRisk plugins with the canonical data model.
---

import { Card, CardGrid } from "@astrojs/starlight/components";

# OpenRisk Plugin SDK

OpenRisk plugins are single TypeScript files. They return flat JSON entities that the OpenRisk app can render consistently.

<CardGrid>
  <Card title="Explore entities" icon="setting">
    Browse every supported entity, inspect its properties, and see how OpenRisk renders it.
  </Card>
  <Card title="Validate output" icon="check-circle">
    Paste plugin JSON into the validation playground and catch schema errors early.
  </Card>
  <Card title="Inline the helper" icon="document">
    Copy the canonical TypeScript helper into a plugin file when you need builder functions.
  </Card>
</CardGrid>

## Current version

The current frontend-compatible data model version is \`${currentModel.version}\`.

Every entity should include:

\`\`\`json
{ "$modelVersion": "${currentModel.version}" }
\`\`\`

Legacy v1 plugin output without \`$modelVersion\` is migrated by current OpenRisk backend builds before scan results are stored.
`;
}

function singleFileGuide() {
  return `---
title: Single-file plugins
description: How to use the inline TypeScript data model helper.
---

# Single-file plugins

OpenRisk currently executes plugins as one TypeScript or JavaScript file without bundling. That means plugin authors should inline the canonical helper instead of importing a package.

## Workflow

1. Copy \`model/openrisk-types.ts\` into the top of the plugin file.
2. Implement named entrypoint exports declared in \`plugin.json\`.
3. Return \`DataModelEntity[]\` from each data-producing entrypoint.
4. Validate the JSON output against \`schemas/data-model-v${currentModel.version}.schema.json\`.

## Example

\`\`\`ts
export async function search(inputs: { target: string }): Promise<DataModelEntity[]> {
  return [
    buildPerson({
      id: \`example:\${inputs.target}\`,
      payload: {
        name: inputs.target,
        isPep: false,
        isSanctioned: false,
      },
    }),
  ];
}
\`\`\`
`;
}

async function main() {
  // public/ subdirs — Astro copies everything in public/ verbatim to dist/
  await mkdir(path("public/schemas"), { recursive: true });
  await mkdir(path("public/examples"), { recursive: true });
  await mkdir(path("public/model"), { recursive: true });
  await mkdir(path("examples"), { recursive: true });

  // JSON schema
  const schema = schemaForModel();
  await writeFile(path(`schemas/data-model-v${currentModel.version}.schema.json`), stableJson(schema));
  await writeFile(path(`public/schemas/data-model-v${currentModel.version}.schema.json`), stableJson(schema));

  // Example output files
  for (const entity of Object.values(currentModel.entities)) {
    const exampleJson = stableJson(entityExample(entity, "common"));
    await writeFile(
      path(`examples/${slugEntity(entity.id)}-output.json`),
      exampleJson,
    );
    await writeFile(
      path(`public/examples/${slugEntity(entity.id)}-output.json`),
      exampleJson,
    );
  }

  // Static manifest schema — copy from schemas/ to public/schemas/
  await copyFile(
    path("schemas/plugin-manifest-v0.0.2.schema.json"),
    path("public/schemas/plugin-manifest-v0.0.2.schema.json"),
  );

  // TypeScript model source files — plugins reference these directly
  const modelDir = new URL("model/", root);
  for (const file of await readdir(modelDir)) {
    if (file.endsWith(".ts")) {
      await copyFile(new URL(file, modelDir), path(`public/model/${file}`));
    }
  }

  console.log(`Generated schema: public/schemas/data-model-v${currentModel.version}.schema.json`);
  console.log(`Copied manifest schema: public/schemas/plugin-manifest-v0.0.2.schema.json`);
  console.log(`Generated ${Object.keys(currentModel.entities).length} example files in public/examples/`);
  console.log(`Copied model TS files to public/model/`);
}

await main();
