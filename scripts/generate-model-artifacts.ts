import { mkdir, writeFile } from "node:fs/promises";
import { dataModelV001 } from "../model/data-model-v0.0.1.ts";
import type { EntitySpec, PropertySpec, TypedValueKind } from "../model/define-model.ts";

const root = new URL("../", import.meta.url);
const docsVersionDirectory = "v0-0-1";

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
    $modelVersion: dataModelV001.version,
    $entity: entity.id,
    $id: `example:${slugEntity(entity.id)}`,
    $props: props,
  };

  if (extra.length) output.$extra = extra;
  return [output];
}

function schemaForModel() {
  const typedValueKinds = Object.keys(dataModelV001.typedValues).filter((kind) => kind !== "key-value");

  return {
    $schema: "http://json-schema.org/draft-07/schema#",
    $id: `https://openriskplatform.github.io/plugin-sdk/schemas/data-model-v${dataModelV001.version}.schema.json`,
    title: `OpenRisk Data Model ${dataModelV001.version} Result`,
    description: dataModelV001.description,
    type: "array",
    items: { $ref: "#/definitions/DataModelEntity" },
    definitions: {
      DataModelEntity: {
        type: "object",
        required: ["$modelVersion", "$entity", "$id"],
        properties: {
          $modelVersion: { const: dataModelV001.version },
          $entity: { enum: Object.keys(dataModelV001.entities) },
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
        oneOf: [
          {
            type: "object",
            required: ["$type", "value"],
            properties: {
              $type: { enum: typedValueKinds },
              value: {},
            },
            additionalProperties: false,
          },
          { $ref: "#/definitions/KeyValue" },
        ],
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

<PropertyTable entity={${mdxValue(entity)}} typedValues={${mdxValue(dataModelV001.typedValues)}} />

<ExampleViewer client:load examples={${mdxValue(examples)}} />
`;
}

function typeIndexPage() {
  const cards = Object.entries(dataModelV001.typedValues)
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
description: Typed value primitives supported by OpenRisk data model ${dataModelV001.version}.
---

<p class="or-lede">Typed values make plugin output machine-readable while keeping entity properties flat.</p>

<div class="or-type-directory">
${cards}
</div>
`;
}

function typePage(id: TypedValueKind) {
  const type = dataModelV001.typedValues[id];
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
  const entities = Object.values(dataModelV001.entities);
  const schema = schemaForModel();

  return `---
title: Data Model ${dataModelV001.version}
description: ${JSON.stringify(dataModelV001.description)}
---

import { ModelExplorer } from "../../../components/react/ModelExplorer";
import { ValidationPlayground } from "../../../components/react/ValidationPlayground";

<p class="or-kicker">Version ${dataModelV001.version}</p>

# ${dataModelV001.title}

<p class="or-lede">${dataModelV001.description}</p>

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

The current frontend-compatible data model version is \`${dataModelV001.version}\`.

Every entity should include:

\`\`\`json
{ "$modelVersion": "${dataModelV001.version}" }
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
4. Validate the JSON output against \`schemas/data-model-v${dataModelV001.version}.schema.json\`.

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
  await mkdir(path("schemas"), { recursive: true });
  await mkdir(path("examples"), { recursive: true });
  await mkdir(path("src/content/docs/guides"), { recursive: true });
  await mkdir(path(`src/content/docs/${docsVersionDirectory}/entities`), { recursive: true });
  await mkdir(path(`src/content/docs/${docsVersionDirectory}/types`), { recursive: true });

  const schema = schemaForModel();
  await writeFile(path(`schemas/data-model-v${dataModelV001.version}.schema.json`), stableJson(schema));

  for (const entity of Object.values(dataModelV001.entities)) {
    await writeFile(
      path(`src/content/docs/${docsVersionDirectory}/entities/${slugEntity(entity.id)}.mdx`),
      entityPage(entity),
    );
    await writeFile(
      path(`examples/${slugEntity(entity.id)}-output.json`),
      stableJson(entityExample(entity, "common")),
    );
  }

  await writeFile(path(`src/content/docs/${docsVersionDirectory}/index.mdx`), modelIndexPage());
  await writeFile(path("src/content/docs/index.mdx"), overviewGuide());
  await writeFile(path(`src/content/docs/${docsVersionDirectory}/types/index.mdx`), typeIndexPage());

  for (const type of Object.keys(dataModelV001.typedValues) as TypedValueKind[]) {
    await mkdir(path(`src/content/docs/${docsVersionDirectory}/types/${type}`), { recursive: true });
    await writeFile(path(`src/content/docs/${docsVersionDirectory}/types/${type}/index.mdx`), typePage(type));
  }

  await writeFile(path("src/content/docs/guides/overview.mdx"), overviewGuide());
  await writeFile(path("src/content/docs/guides/single-file-plugins.mdx"), singleFileGuide());
}

await main();
