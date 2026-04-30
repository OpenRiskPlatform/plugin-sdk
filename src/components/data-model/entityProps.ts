import type { TypedValue } from "@/core/data-model/types";

export function propList(entity: { $props?: Record<string, TypedValue[]> }, key: string): TypedValue[] {
  const values = entity.$props?.[key];
  return Array.isArray(values) ? values : [];
}

export function firstProp(entity: { $props?: Record<string, TypedValue[]> }, key: string): TypedValue | undefined {
  return propList(entity, key)[0];
}

export function hasDisplayValue(value: TypedValue | undefined): boolean {
  if (!value) return false;
  const raw = value.value;
  if (raw === null || raw === undefined) return false;
  if (typeof raw === "string" && raw.trim() === "") return false;
  return true;
}
