export type TypedValueKind =
  | "string"
  | "number"
  | "boolean"
  | "jurisdiction-iso-3166-2"
  | "date-iso8601"
  | "date-partial-iso8601"
  | "date-time-iso8601"
  | "url"
  | "address"
  | "location-iso6709"
  | "image-url"
  | "image-base64"
  | "key-value";

export type FrontendSupport =
  | "primary"
  | "properties"
  | "extra"
  | "generic"
  | "not-special";

export interface TypedValueSpec {
  label: string;
  jsonType: "string" | "number" | "boolean" | "object";
  description: string;
  examples: unknown[];
  detail: string;
  allowedValues?: readonly unknown[];
}

export interface PropertySpec {
  label: string;
  types: readonly TypedValueKind[];
  required?: boolean;
  multiplicity?: "one" | "many";
  description: string;
  examples: readonly unknown[];
  builderField?: string;
  frontend?: FrontendSupport;
  notes?: string;
}

export interface EntitySpec {
  id: string;
  label: string;
  icon: string;
  group: "Identity" | "Screening" | "Media" | "Operations";
  description: string;
  usage: string;
  frontend: FrontendSupport;
  props: Record<string, PropertySpec>;
  examples: {
    minimal: Record<string, unknown>;
    common: Record<string, unknown>;
    full: Record<string, unknown>;
  };
}

export interface DataModelSpec {
  version: string;
  title: string;
  description: string;
  typedValues: Record<TypedValueKind, TypedValueSpec>;
  entities: Record<string, EntitySpec>;
}

export function defineDataModel<T extends DataModelSpec>(spec: T): T {
  return spec;
}
