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

/** Look up a human-readable label for a service type slug within a niche. */
export function getServiceLabel(nicheId: string, slug: string): string {
  return SERVICE_LABELS[nicheId]?.[slug] ?? slug;
}

/** Get all service types for a niche as { type, label } pairs. */
export function getServiceTypesForNiche(nicheId: string): Array<{ type: string; label: string }> {
  const labels = SERVICE_LABELS[nicheId];
  if (!labels) return [];
  return Object.entries(labels).map(([type, label]) => ({ type, label }));
}
