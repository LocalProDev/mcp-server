type LabelMap = Record<string, string>;
type NicheLabels = Record<string, LabelMap>;

export const SERVICE_LABELS: NicheLabels = {
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
  'soaked-local': {
    water_extraction: 'Water Extraction',
    structural_drying: 'Structural Drying',
    mold_remediation: 'Mold Remediation',
    flood_cleanup: 'Flood Cleanup',
    sewage_cleanup: 'Sewage Cleanup',
    content_restoration: 'Content Restoration',
    reconstruction: 'Reconstruction',
    emergency_service: 'Emergency Service',
  },
  'wellwater-local': {
    well_drilling: 'Well Drilling',
    well_pump_installation: 'Well Pump Installation',
    well_pump_repair: 'Well Pump Repair',
    water_testing: 'Water Testing',
    water_treatment_softener: 'Water Softener',
    water_treatment_iron_filter: 'Iron Filter',
    water_treatment_uv: 'UV Disinfection',
    water_treatment_ro: 'Reverse Osmosis',
    well_rehabilitation: 'Well Rehabilitation',
    well_abandonment: 'Well Abandonment',
    well_inspection: 'Well Inspection',
  },
};

interface KeywordMatcher {
  keywords: string[];
  slug: string;
}

const KEYWORD_MATCHERS: Record<string, KeywordMatcher[]> = {
  'coated-local': [
    { keywords: ['metallic'], slug: 'metallic_epoxy' },
    { keywords: ['polyaspartic'], slug: 'polyaspartic' },
    { keywords: ['polyurea'], slug: 'polyurea' },
    { keywords: ['flake', 'chip', 'broadcast', 'quartz'], slug: 'flake_chip' },
    { keywords: ['polish'], slug: 'concrete_polishing' },
    { keywords: ['seal'], slug: 'concrete_sealing' },
    { keywords: ['epoxy'], slug: 'epoxy' },
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
    { keywords: ['lead paint remov'], slug: 'lead_paint_removal' },
    { keywords: ['lead test', 'lead inspect'], slug: 'lead_testing' },
    { keywords: ['air quality'], slug: 'air_quality_testing' },
    { keywords: ['biohazard'], slug: 'biohazard_cleanup' },
  ],
};

export function getServiceLabel(nicheId: string, value: string): string {
  const directMatch = SERVICE_LABELS[nicheId]?.[value];
  if (directMatch) return directMatch;
  const matchers = KEYWORD_MATCHERS[nicheId];
  if (matchers) {
    const lower = value.toLowerCase();
    for (const matcher of matchers) {
      if (matcher.keywords.some((kw) => lower.includes(kw))) {
        return SERVICE_LABELS[nicheId]?.[matcher.slug] ?? value;
      }
    }
  }
  return value;
}

export function getServiceTypesForNiche(nicheId: string): Array<{ type: string; label: string }> {
  const labels = SERVICE_LABELS[nicheId] ?? {};
  return Object.entries(labels).map(([type, label]) => ({ type, label }));
}
