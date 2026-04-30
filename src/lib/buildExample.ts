import type { EntitySpec } from "@model/define-model.ts";
import type { DataModelEntity } from "@/core/data-model/types";

function slugEntity(id: string) {
  return id.replace(/^entity\./, "");
}

function scalarToTypedValue(prop: { types: readonly string[] | string[] }, value: unknown) {
  const type = prop.types[0];
  if (type === "key-value") return null;
  return { $type: type, value };
}

export function buildExampleEntity(
  entity: EntitySpec,
  variant: "minimal" | "common" | "full"
): DataModelEntity[] {
  const values = entity.examples[variant] as Record<string, unknown>;
  const props: Record<string, { $type: string; value: unknown }[]> = {};
  const extra: { $type: string; value: unknown }[] = [];

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

  const output: DataModelEntity = {
    $entity: entity.id,
    $id: `example:${slugEntity(entity.id)}`,
    $props: props,
  };

  if (extra.length) (output as Record<string, unknown>).$extra = extra;
  return [output];
}

export function buildAllExamples(entity: EntitySpec) {
  return {
    minimal: buildExampleEntity(entity, "minimal"),
    common: buildExampleEntity(entity, "common"),
    full: buildExampleEntity(entity, "full"),
  };
}
