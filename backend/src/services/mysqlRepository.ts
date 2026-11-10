import type { Pool } from 'mysql2/promise';
import type {
  AnimationMode,
  ComponentCategory,
  DamageScenario,
  DamageSimKind,
  SuspensionComponent,
  SuspensionId,
  SuspensionType,
} from '@suspension-lab/shared/types';
import {
  json,
  type ComponentRow,
  type DamageRow,
  type EducationRow,
  type IncludeRow,
  type SuspensionComponentRow,
  type SuspensionRow,
} from '../models/rows.js';
import type { ContentRepository } from './repository.js';

export class MySqlContentRepository implements ContentRepository {
  constructor(private readonly pool: Pool) {}

  async ping(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  async listSuspensions(): Promise<SuspensionType[]> {
    const [rows] = await this.pool.query<SuspensionRow[]>('SELECT * FROM suspension_types ORDER BY sort_order, id');
    const [links] = await this.pool.query<SuspensionComponentRow[]>(
      `SELECT st.slug AS suspension_slug, c.slug AS component_slug, sc.local_name, sc.role_description, sc.quantity_note, sc.sort_order
       FROM suspension_components sc
       JOIN suspension_types st ON st.id = sc.suspension_type_id
       JOIN components c ON c.id = sc.component_id
       ORDER BY sc.sort_order, sc.id`,
    );
    return rows.map((r) => ({
      id: r.slug as SuspensionId,
      name: r.name,
      nameEn: r.name_en,
      tagline: r.tagline,
      axlePosition: r.axle_position,
      independence: r.independence,
      summary: r.summary,
      description: r.description,
      howItWorks: json(r.how_it_works),
      typicalApplications: json(r.typical_applications),
      advantages: json(r.advantages),
      disadvantages: json(r.disadvantages),
      steerable: Boolean(r.steerable),
      modelKey: r.model_key,
      sortOrder: r.sort_order,
      components: links
        .filter((l) => l.suspension_slug === r.slug)
        .map((l) => ({
          componentId: l.component_slug,
          roleDescription: l.role_description,
          sortOrder: l.sort_order,
          ...(l.local_name ? { localName: l.local_name } : {}),
          ...(l.quantity_note ? { quantityNote: l.quantity_note } : {}),
        })),
    }));
  }

  async listComponents(): Promise<SuspensionComponent[]> {
    const [rows] = await this.pool.query<ComponentRow[]>('SELECT * FROM components ORDER BY sort_order, id');
    const [edu] = await this.pool.query<EducationRow[]>(
      `SELECT c.slug AS component_slug, e.content_type, e.title, e.body, e.sort_order
       FROM component_education e JOIN components c ON c.id = e.component_id
       ORDER BY e.component_id, e.content_type, e.sort_order`,
    );
    const [inc] = await this.pool.query<IncludeRow[]>(
      `SELECT p.slug AS parent_slug, ch.slug AS child_slug
       FROM component_includes ci
       JOIN components p ON p.id = ci.parent_component_id
       JOIN components ch ON ch.id = ci.child_component_id
       ORDER BY ci.sort_order`,
    );
    const pick = (slug: string, type: EducationRow['content_type']) =>
      edu.filter((e) => e.component_slug === slug && e.content_type === type);
    return rows.map((r) => {
      const includes = inc.filter((i) => i.parent_slug === r.slug).map((i) => i.child_slug);
      return {
        id: r.slug,
        name: r.name,
        nameEn: r.name_en,
        category: r.category as ComponentCategory,
        summary: r.summary,
        function: r.function_text,
        workingPrinciple: r.working_principle,
        location: r.location,
        failureModes: pick(r.slug, 'failure_mode').map((e) => e.body),
        symptoms: pick(r.slug, 'symptom').map((e) => e.body),
        consequences: pick(r.slug, 'consequence').map((e) => e.body),
        inspection: pick(r.slug, 'inspection_step').map((e) => e.body),
        terms: pick(r.slug, 'term').map((e) => ({ term: e.title ?? '', definition: e.body })),
        ...(includes.length ? { includes } : {}),
        sortOrder: r.sort_order,
      };
    });
  }

  async listDamageScenarios(): Promise<DamageScenario[]> {
    const [rows] = await this.pool.query<DamageRow[]>(
      `SELECT d.*, c.slug AS component_slug FROM damage_scenarios d
       JOIN components c ON c.id = d.component_id ORDER BY d.sort_order, d.id`,
    );
    return rows.map((r) => ({
      id: r.slug,
      componentId: r.component_slug,
      title: r.title,
      shortTitle: r.short_title,
      severity: r.severity,
      normalCondition: r.normal_condition,
      damagedCondition: r.damaged_condition,
      failureDescription: r.failure_description,
      symptoms: json(r.symptoms),
      safetyImplications: json(r.safety_implications),
      inspection: json(r.inspection_steps),
      simulation: {
        kind: r.sim_kind as DamageSimKind,
        params: json(r.sim_params),
        recommendedMode: r.recommended_mode as AnimationMode,
      },
      sortOrder: r.sort_order,
    }));
  }
}
