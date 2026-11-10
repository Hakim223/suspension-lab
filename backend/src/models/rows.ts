import type { RowDataPacket } from 'mysql2/promise';

export interface SuspensionRow extends RowDataPacket {
  id: number;
  slug: string;
  name: string;
  name_en: string;
  tagline: string;
  axle_position: 'depan' | 'belakang';
  independence: 'independen' | 'semi-independen' | 'dependen';
  summary: string;
  description: string;
  how_it_works: string[] | string;
  typical_applications: string[] | string;
  advantages: string[] | string;
  disadvantages: string[] | string;
  steerable: number;
  model_key: string;
  sort_order: number;
}

export interface SuspensionComponentRow extends RowDataPacket {
  suspension_slug: string;
  component_slug: string;
  local_name: string | null;
  role_description: string;
  quantity_note: string | null;
  sort_order: number;
}

export interface ComponentRow extends RowDataPacket {
  id: number;
  slug: string;
  name: string;
  name_en: string;
  category: string;
  summary: string;
  function_text: string;
  working_principle: string;
  location: string;
  sort_order: number;
}

export interface EducationRow extends RowDataPacket {
  component_slug: string;
  content_type: 'failure_mode' | 'symptom' | 'consequence' | 'inspection_step' | 'term';
  title: string | null;
  body: string;
  sort_order: number;
}

export interface IncludeRow extends RowDataPacket {
  parent_slug: string;
  child_slug: string;
}

export interface DamageRow extends RowDataPacket {
  slug: string;
  component_slug: string;
  title: string;
  short_title: string;
  severity: 'sedang' | 'tinggi';
  normal_condition: string;
  damaged_condition: string;
  failure_description: string;
  symptoms: string[] | string;
  safety_implications: string[] | string;
  inspection_steps: string[] | string;
  sim_kind: string;
  sim_params: Record<string, number> | string;
  recommended_mode: 'bump' | 'rough' | 'steer' | 'manual';
  sort_order: number;
}

/** mysql2 parses JSON columns automatically; some proxies return strings — handle both. */
export function json<T>(v: T | string): T {
  return typeof v === 'string' ? (JSON.parse(v) as T) : v;
}
