/**
 * Static service type label map — derived from niche configs.
 * Maps niche_id → { service_slug: "Human-Readable Label" }.
 *
 * This gives AI agents semantic context for service types instead of raw slugs.
 */

export const SERVICE_LABELS: Record<string, Record<string, string>> = {
  'abate-local': {
    mold_remediation: 'Mold Remediation',
    mold_testing: 'Mold Testing & Inspection',
    asbestos_removal: 'Asbestos Removal',
    asbestos_testing: 'Asbestos Testing',
    lead_paint_removal: 'Lead Paint Removal',
    lead_testing: 'Lead Testing',
    air_quality_testing: 'Air Quality Testing',
    biohazard_cleanup: 'Biohazard Cleanup',
  },
  'basement-local': {
    interior_waterproofing: 'Interior Waterproofing',
    exterior_waterproofing: 'Exterior Waterproofing',
    crack_repair: 'Foundation Crack Repair',
    sump_pump: 'Sump Pump Installation',
    drainage_system: 'Interior Drainage System',
    mold_remediation: 'Mold Remediation',
    structural_repair: 'Structural Repair',
    dehumidifier: 'Dehumidifier Installation',
  },
  'coated-local': {
    epoxy: 'Epoxy Floor Coating',
    polyaspartic: 'Polyaspartic Coating',
    polyurea: 'Polyurea Coating',
    metallic_epoxy: 'Metallic Epoxy',
    flake_chip: 'Flake / Chip Broadcast',
    concrete_polishing: 'Concrete Polishing',
    concrete_sealing: 'Concrete Sealing',
  },
  'crawl-local': {
    encapsulation: 'Crawl Space Encapsulation',
    vapor_barrier: 'Vapor Barrier Installation',
    waterproofing: 'Crawl Space Waterproofing',
    drainage: 'Interior Drainage System',
    sump_pump: 'Sump Pump Installation',
    dehumidifier: 'Dehumidifier Installation',
    mold_remediation: 'Mold Remediation',
    structural_repair: 'Structural / Joist Repair',
  },
  'hire-electrical': {
    ir_thermography: 'IR Thermography',
    generator_service: 'Generator Service',
    ev_charger: 'EV Charger Installation',
    commercial_electrical: 'Commercial Electrical',
  },
  'pump-local': {
    pumping: 'Septic Tank Pumping',
    inspection: 'Septic Inspection',
    drain_field_repair: 'Drain Field Repair',
    tank_replacement: 'Tank Replacement',
    new_installation: 'New System Installation',
    emergency: 'Emergency Service',
  },
  'radon-local': {
    radon_testing: 'Radon Testing',
    radon_mitigation: 'Radon Mitigation',
    ssd_installation: 'Sub-Slab Depressurization',
    fan_replacement: 'Fan Replacement',
    post_mitigation_testing: 'Post-Mitigation Testing',
    commercial_radon: 'Commercial Radon Services',
    continuous_monitoring: 'Continuous Monitoring',
  },
  'slab-local': {
    slab_repair: 'Slab Foundation Repair',
    pier_installation: 'Pier Installation',
    concrete_leveling: 'Concrete Leveling',
    mudjacking: 'Mudjacking',
    foam_injection: 'Foam Injection',
    foundation_crack_repair: 'Foundation Crack Repair',
    bowed_wall_repair: 'Bowed Wall Repair',
    house_leveling: 'House Leveling',
    structural_repair: 'Structural Repair',
  },
  'suds-local': {
    wash_fold: 'Wash & Fold',
    dry_cleaning: 'Dry Cleaning',
    shirt_service: 'Shirt Service',
    household: 'Household Items',
    specialty: 'Specialty Items',
    commercial: 'Commercial',
    pickup_delivery: 'Pickup & Delivery',
    laundry: 'General Laundry',
  },
};

/**
 * Keyword → canonical slug mapping per niche.
 * Handles free-text enriched_services values like "epoxy flooring" → "epoxy".
 */
const KEYWORD_MATCHERS: Record<string, Array<{ keywords: string[]; slug: string }>> = {
  'coated-local': [
    // More specific patterns MUST come before generic ones
    { keywords: ['metallic'], slug: 'metallic_epoxy' },
    { keywords: ['polyaspartic'], slug: 'polyaspartic' },
    { keywords: ['polyurea'], slug: 'polyurea' },
    { keywords: ['flake', 'chip', 'broadcast', 'quartz'], slug: 'flake_chip' },
    { keywords: ['polish'], slug: 'concrete_polishing' },
    { keywords: ['seal'], slug: 'concrete_sealing' },
    { keywords: ['epoxy'], slug: 'epoxy' }, // Generic epoxy last — catches "epoxy flooring", "epoxy coatings"
  ],
  'radon-local': [
    { keywords: ['testing', 'test', 'inspection'], slug: 'radon_testing' },
    { keywords: ['mitigation', 'remediation', 'removal', 'abatement'], slug: 'radon_mitigation' },
    { keywords: ['sub-slab', 'ssd', 'depressurization'], slug: 'ssd_installation' },
    { keywords: ['fan'], slug: 'fan_replacement' },
    { keywords: ['post-mitigation', 'post mitigation'], slug: 'post_mitigation_testing' },
    { keywords: ['commercial'], slug: 'commercial_radon' },
    { keywords: ['monitoring', 'continuous'], slug: 'continuous_monitoring' },
  ],
  'basement-local': [
    { keywords: ['interior waterproof'], slug: 'interior_waterproofing' },
    { keywords: ['exterior waterproof'], slug: 'exterior_waterproofing' },
    { keywords: ['crack'], slug: 'crack_repair' },
    { keywords: ['sump'], slug: 'sump_pump' },
    { keywords: ['drainage', 'drain'], slug: 'drainage_system' },
    { keywords: ['mold'], slug: 'mold_remediation' },
    { keywords: ['structural'], slug: 'structural_repair' },
    { keywords: ['dehumidif'], slug: 'dehumidifier' },
  ],
  'crawl-local': [
    { keywords: ['encapsulat'], slug: 'encapsulation' },
    { keywords: ['vapor', 'barrier'], slug: 'vapor_barrier' },
    { keywords: ['waterproof'], slug: 'waterproofing' },
    { keywords: ['drainage', 'drain'], slug: 'drainage' },
    { keywords: ['sump'], slug: 'sump_pump' },
    { keywords: ['dehumidif'], slug: 'dehumidifier' },
    { keywords: ['mold'], slug: 'mold_remediation' },
    { keywords: ['structural', 'joist'], slug: 'structural_repair' },
  ],
  'slab-local': [
    { keywords: ['slab'], slug: 'slab_repair' },
    { keywords: ['pier'], slug: 'pier_installation' },
    { keywords: ['leveling', 'level'], slug: 'concrete_leveling' },
    { keywords: ['mudjack'], slug: 'mudjacking' },
    { keywords: ['foam'], slug: 'foam_injection' },
    { keywords: ['crack'], slug: 'foundation_crack_repair' },
    { keywords: ['bowed', 'bow'], slug: 'bowed_wall_repair' },
    { keywords: ['house level'], slug: 'house_leveling' },
    { keywords: ['structural'], slug: 'structural_repair' },
  ],
  'abate-local': [
    { keywords: ['mold remov', 'mold remed'], slug: 'mold_remediation' },
    { keywords: ['mold test', 'mold inspect'], slug: 'mold_testing' },
    { keywords: ['asbestos remov', 'asbestos abat'], slug: 'asbestos_removal' },
    { keywords: ['asbestos test', 'asbestos inspect'], slug: 'asbestos_testing' },
    { keywords: ['lead paint', 'lead remov', 'lead abat'], slug: 'lead_paint_removal' },
    { keywords: ['lead test', 'lead inspect'], slug: 'lead_testing' },
    { keywords: ['air quality', 'iaq'], slug: 'air_quality_testing' },
    { keywords: ['biohazard'], slug: 'biohazard_cleanup' },
  ],
  'pump-local': [
    { keywords: ['pump'], slug: 'pumping' },
    { keywords: ['inspect'], slug: 'inspection' },
    { keywords: ['drain field'], slug: 'drain_field_repair' },
    { keywords: ['tank replac'], slug: 'tank_replacement' },
    { keywords: ['install', 'new system'], slug: 'new_installation' },
    { keywords: ['emergency'], slug: 'emergency' },
  ],
  'suds-local': [
    { keywords: ['wash', 'fold'], slug: 'wash_fold' },
    { keywords: ['dry clean'], slug: 'dry_cleaning' },
    { keywords: ['shirt'], slug: 'shirt_service' },
    { keywords: ['household', 'bedding', 'comforter'], slug: 'household' },
    { keywords: ['specialty', 'wedding', 'leather'], slug: 'specialty' },
    { keywords: ['commercial', 'business'], slug: 'commercial' },
    { keywords: ['pickup', 'delivery'], slug: 'pickup_delivery' },
    { keywords: ['laundry', 'general'], slug: 'laundry' },
  ],
  'hire-electrical': [
    { keywords: ['ir ', 'infrared', 'thermograph'], slug: 'ir_thermography' },
    { keywords: ['generator'], slug: 'generator_service' },
    { keywords: ['ev ', 'charger', 'evitp'], slug: 'ev_charger' },
    { keywords: ['commercial', 'industrial'], slug: 'commercial_electrical' },
  ],
};

/**
 * Look up a human-readable label for a service type value within a niche.
 * Handles both canonical slugs (from provider_services) and free-text
 * enriched_services values (from website scraping).
 */
export function getServiceLabel(nicheId: string, value: string): string {
  // Direct slug match first
  const directMatch = SERVICE_LABELS[nicheId]?.[value];
  if (directMatch) return directMatch;

  // Fuzzy keyword match for free-text enriched values
  const matchers = KEYWORD_MATCHERS[nicheId];
  if (matchers) {
    const lower = value.toLowerCase();
    for (const matcher of matchers) {
      if (matcher.keywords.some((kw) => lower.includes(kw))) {
        return SERVICE_LABELS[nicheId]?.[matcher.slug] ?? value;
      }
    }
  }

  // No match — return original value (still readable by agents)
  return value;
}

/** Get all service types for a niche as { type, label } pairs. */
export function getServiceTypesForNiche(nicheId: string): Array<{ type: string; label: string }> {
  const labels = SERVICE_LABELS[nicheId];
  if (!labels) return [];
  return Object.entries(labels).map(([type, label]) => ({ type, label }));
}
