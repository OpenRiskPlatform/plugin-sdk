export interface TypedValue<T = unknown> {
  $type: string;
  value: T;
}

export interface SourceDescriptor {
  name: string;
  source: string;
}

export interface DataModelEntity {
  $entity: string;
  $id: string;
  $sources?: SourceDescriptor[];
  $props?: Record<string, TypedValue[]>;
  $extra?: TypedValue[];
}

export type DataModelResult = DataModelEntity[];
