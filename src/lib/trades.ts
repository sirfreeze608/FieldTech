export type TradeId =
  | 'mason'
  | 'carpenter'
  | 'framer'
  | 'hvac'
  | 'electrician'
  | 'plumber'
  | 'welder'
  | 'roofer'
  | 'it'
  | 'general';

export interface TradeDefinition {
  id: TradeId;
  label: string;
  pluralLabel: string;
  shortCode: string;
  description: string;
  badgeClasses: string;
  accentDotClass: string;
  categories: string[];
  certifications: string[];
  checklistTemplates: string[];
  defaultPermit?: string;
  materialUnits: string[];
  commonMaterials: string[];
}

export const TRADES: Record<TradeId, TradeDefinition> = {
  mason: {
    id: 'mason',
    label: 'Mason',
    pluralLabel: 'Masons',
    shortCode: 'MSN',
    description: 'Brick, CMU block, concrete slabs, foundations & tuckpointing',
    badgeClasses: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60',
    accentDotClass: 'bg-amber-600',
    categories: ['Brick & Block', 'Concrete & Slab', 'Tuckpointing', 'Foundation & Footing', 'Stone Veneer'],
    certifications: ['OSHA 30', 'ACI Concrete Flatwork', 'MCAA Certified Mason', 'Scaffold Erector', 'Refractory Brick'],
    checklistTemplates: [
      'Verify ambient & cure temp (>40°F)',
      'Check mortar mix ratio & slump spec',
      'Inspect footing & rebar placement',
      'Verify plumb, level & course line',
      'Strike joints & clean efflorescence',
    ],
    defaultPermit: 'Excavation / Scaffold Inspection',
    materialUnits: ['bags', 'pcs', 'cu yd', 'tons', 'lbs'],
    commonMaterials: ['8" CMU Block', 'Standard Modular Brick', 'Type S Mortar (80lb)', '60lb Concrete Mix', '#4 Rebar (20ft)', 'Masonry Sand'],
  },
  carpenter: {
    id: 'carpenter',
    label: 'Carpenter',
    pluralLabel: 'Carpenters',
    shortCode: 'CRP',
    description: 'Finish trim, cabinetry, millwork, doors, hardware & drywall',
    badgeClasses: 'bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800/60',
    accentDotClass: 'bg-orange-600',
    categories: ['Finish Trim & Molding', 'Cabinetry & Millwork', 'Doors & Hardware', 'Drywall & Backing', 'Stairs & Decks'],
    certifications: ['Journeyman Carpenter', 'OSHA 10/30', 'Blueprint Reading', 'Cabinetry & Millwork', 'Aerial Lift Certified'],
    checklistTemplates: [
      'Verify rough opening & plumbness',
      'Acclimate lumber/trim to site humidity',
      'Check fastener spacing & countersink',
      'Verify door reveal & latch alignment',
      'Sand, fill & prep for finish coat',
    ],
    materialUnits: ['pcs', 'ft', 'sheets', 'boxes', 'gal'],
    commonMaterials: ['1x4 Pine Trim (12ft)', '4x8 Birch Plywood', '5/8" Type X Drywall', '2" Finish Nails (box)', 'Commercial Mortise Lockset', 'Wood Glue'],
  },
  framer: {
    id: 'framer',
    label: 'Framer',
    pluralLabel: 'Framers',
    shortCode: 'FRM',
    description: 'Structural wood & steel stud framing, trusses, headers & sheathing',
    badgeClasses: 'bg-yellow-50 text-yellow-800 border-yellow-200 dark:bg-yellow-950/50 dark:text-yellow-300 dark:border-yellow-800/60',
    accentDotClass: 'bg-yellow-600',
    categories: ['Wood Stud Framing', 'Metal Stud & Track', 'Roof Trusses & Joists', 'Sheathing & Subfloor', 'Structural Headers'],
    certifications: ['Structural Framing Lead', 'Light-Gauge Steel Stud', 'Crane & Truss Rigging', 'Laser Level Layout', 'Shear Wall & Hold-Down'],
    checklistTemplates: [
      'Snap chalk lines & verify 3-4-5 square',
      'Verify stud spacing (16" or 24" OC)',
      'Install Simpson ties & hurricane clips',
      'Verify header sizing & king/jack studs',
      'Check sheathing nail pattern & 1/8" gap',
    ],
    defaultPermit: 'Structural Framing Inspection',
    materialUnits: ['pcs', 'sheets', 'ft', 'lbs', 'boxes'],
    commonMaterials: ['2x4x8 SPF Stud', '2x6x10 PT Plate', '3-5/8" 20ga Metal Stud', '4x8 7/16" OSB Sheathing', 'LVL Beam (1-3/4x11-7/8)', 'Simpson H2.5A Tie'],
  },
  hvac: {
    id: 'hvac',
    label: 'HVAC',
    pluralLabel: 'HVAC Techs',
    shortCode: 'HVC',
    description: 'Rooftop units, chillers, ductwork, refrigerant, boilers & BAS controls',
    badgeClasses: 'bg-cyan-50 text-cyan-800 border-cyan-200 dark:bg-cyan-950/50 dark:text-cyan-300 dark:border-cyan-800/60',
    accentDotClass: 'bg-cyan-600',
    categories: ['RTU / Chiller Service', 'Ductwork & Airflow', 'Refrigerant & Brazing', 'Controls & Thermostats', 'Boilers & Heat Pumps'],
    certifications: ['EPA 608 Universal', 'NATE Certified', 'DDC / BAS Controls', 'Oxy-Acetylene Brazing', 'OSHA 30'],
    checklistTemplates: [
      'Lockout/Tagout & verify disconnect',
      'Measure supply/return ΔT & static pressure',
      'Check superheat & subcooling targets',
      'Verify condensate drain & float switch',
      'Inspect belts, MERV filters & amp draw',
    ],
    defaultPermit: 'EPA Refrigerant / Hot Work',
    materialUnits: ['lbs', 'ea', 'ft', 'cans', 'pcs'],
    commonMaterials: ['R-410A Refrigerant', '24x24x2 MERV-13 Filter', '3/4" Copper Line Set', 'Honeywell T-Stat', 'Condensate Pump', 'Foil Scrim Tape'],
  },
  electrician: {
    id: 'electrician',
    label: 'Electrician',
    pluralLabel: 'Electricians',
    shortCode: 'ELC',
    description: 'Switchgear, panels, conduit, wire pulls, breakers, lighting & backup power',
    badgeClasses: 'bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800/60',
    accentDotClass: 'bg-indigo-600',
    categories: ['Panels & Switchgear', 'Conduit & Wire Pull', 'Lighting & Ballasts', 'Breakers & GFCI', 'Generators & ATS'],
    certifications: ['Master / Journeyman License', 'NFPA 70E Arc Flash', 'NEC Code Compliant', 'Medium/High Voltage', 'Fire Alarm / Low Voltage'],
    checklistTemplates: [
      'De-energize, LOTO & verify zero-energy',
      'Verify conductor gauge & ampacity',
      'Torque lug terminations to spec',
      'Test GFCI/AFCI & ground continuity',
      'Label panel schedule & circuit directory',
    ],
    defaultPermit: 'Electrical LOTO / Energized Work',
    materialUnits: ['ft', 'ea', 'pcs', 'boxes', 'rolls'],
    commonMaterials: ['12/2 MC Cable (250ft)', '3/4" EMT Conduit (10ft)', '20A QO Breaker', '#10 THHN Copper', '4x4 Junction Box', 'GFCI Duplex Receptacle'],
  },
  plumber: {
    id: 'plumber',
    label: 'Plumber',
    pluralLabel: 'Plumbers',
    shortCode: 'PLB',
    description: 'Supply piping, drain/sewer lines, backflow testing, water heaters & gas',
    badgeClasses: 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800/60',
    accentDotClass: 'bg-blue-600',
    categories: ['Supply & Copper/PEX', 'Drain & Sewer Lines', 'Backflow Testing', 'Water Heaters & Boilers', 'Gas Piping'],
    certifications: ['Master / Journeyman Plumber', 'Backflow Prevention Tester', 'Med-Gas Brazing', 'Gas Pipe Fitter', 'Confined Space'],
    checklistTemplates: [
      'Isolate main shutoff & drain down line',
      'Inspect for corrosion & dielectric unions',
      'Pressure test system (air/hydrostatic)',
      'Check trap seals, venting & slope (1/4"/ft)',
      'Verify backflow & PRV calibration',
    ],
    defaultPermit: 'Plumbing Pressure / Backflow Cert',
    materialUnits: ['ft', 'ea', 'pcs', 'cans', 'lbs'],
    commonMaterials: ['3/4" Type L Copper (10ft)', '1" PEX-A Tubing', '3" Schedule 40 PVC', 'ProPress 90° Elbow', 'RPZ Backflow Assembly', 'Lead-Free Solder'],
  },
  welder: {
    id: 'welder',
    label: 'Welder',
    pluralLabel: 'Welders',
    shortCode: 'WLD',
    description: 'Structural steel erection, MIG/TIG/Stick fab, pipe welding & anchors',
    badgeClasses: 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/60',
    accentDotClass: 'bg-rose-600',
    categories: ['Structural Steel', 'MIG / TIG Fabrication', 'Pipe Welding', 'Baseplates & Anchors', 'Stairs & Railings'],
    certifications: ['AWS D1.1 Structural', 'SMAW / GMAW / GTAW', 'Hot Work Permit Lead', 'Rigging & Signaling', 'NDT Visual Prep'],
    checklistTemplates: [
      'Issue Hot Work Permit & assign fire watch',
      'Clear flammables within 35ft radius',
      'Verify base metal prep & root gap',
      'Inspect weld bead profile & remove slag',
      'Apply primer / cold galvanizing coat',
    ],
    defaultPermit: 'Hot Work & Fire Watch Permit',
    materialUnits: ['lbs', 'ea', 'ft', 'pcs', 'tanks'],
    commonMaterials: ['E7018 1/8" Electrodes', 'ER70S-6 MIG Wire Spool', 'W8x31 Wide Flange Beam', '3/4" A325 Structural Bolts', '75/25 Argon-CO2 Cylinder', 'Cold Galvanizing Spray'],
  },
  roofer: {
    id: 'roofer',
    label: 'Roofer',
    pluralLabel: 'Roofers',
    shortCode: 'ROF',
    description: 'TPO/EPDM membrane, flashing, shingle/metal roofs & leak diagnostics',
    badgeClasses: 'bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800/60',
    accentDotClass: 'bg-teal-600',
    categories: ['TPO / EPDM Membrane', 'Flashing & Coping', 'Shingle & Metal Roof', 'Leak Diagnostics', 'Drains & Scuppers'],
    certifications: ['NRCA ProCertified', 'Fall Protection Competent', 'Hot-Air Membrane Welding', 'OSHA 30', 'Infrared Moisture Scan'],
    checklistTemplates: [
      'Anchor fall arrest / perimeter safety line',
      'Inspect decking & substrate moisture',
      'Hot-air weld seams & probe laps',
      'Seal counter-flashing & pitch pockets',
      'Clear roof drains & conduct flood test',
    ],
    defaultPermit: 'Fall Protection / Roof Access',
    materialUnits: ['rolls', 'sq', 'sheets', 'gal', 'boxes'],
    commonMaterials: ['60-mil TPO Membrane Roll', '2" Polyiso Insulation Board', 'EPDM Bonding Adhesive', 'Lap Sealant Tube', 'Galvanized Drip Edge', '3" Insulation Plates & Screws'],
  },
  it: {
    id: 'it',
    label: 'IT & Network',
    pluralLabel: 'IT Techs',
    shortCode: 'ITN',
    description: 'Hardware, servers, structured cabling, fiber, rack & stack, software',
    badgeClasses: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
    accentDotClass: 'bg-slate-700',
    categories: ['Hardware', 'Software', 'Structured Cabling', 'Rack & Move', 'Access Control & CCTV'],
    certifications: ['Cisco CCNA', 'Fiber Splicing', 'Windows Server', 'BICSI Installer', 'Low Voltage'],
    checklistTemplates: [
      'Verify backup & maintenance window',
      'Label patch panel & port terminations',
      'Test link speed / OTDR fiber loss',
      'Verify UPS load & redundancy',
      'Update asset inventory & port map',
    ],
    materialUnits: ['ft', 'ea', 'pcs', 'boxes'],
    commonMaterials: ['Cat6A Plenum Cable (1000ft)', 'LC-LC OM4 Fiber Patch', '48-Port PoE+ Switch', 'Keystone Jack', '1U Cable Manager', '1500VA UPS Battery'],
  },
  general: {
    id: 'general',
    label: 'General Trades',
    pluralLabel: 'General Crew',
    shortCode: 'GEN',
    description: 'Site prep, demolition, punch list, painting & preventive maintenance',
    badgeClasses: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60',
    accentDotClass: 'bg-emerald-600',
    categories: ['Punch List', 'Painting & Finishes', 'Site Prep & Demo', 'Preventive Maintenance', 'Safety & Inspection'],
    certifications: ['OSHA 10/30', 'Forklift / Scissor Lift', 'First Aid / CPR', 'Lead & Asbestos Awareness', 'Site Safety Lead'],
    checklistTemplates: [
      'Inspect work zone & PPE compliance',
      'Protect adjacent finished surfaces',
      'Complete scope & clean debris',
      'Capture before/after site photos',
      'Sign off punch-list inspection',
    ],
    materialUnits: ['ea', 'gal', 'pcs', 'boxes', 'rolls'],
    commonMaterials: ['Interior Latex Primer (5gal)', '6-mil Poly Sheeting', 'Heavy Duty Floor Protection', 'Painter Tape (case)', 'Firestop Caulk', 'Caution Barricade Tape'],
  },
};

export const TRADE_LIST: TradeDefinition[] = Object.values(TRADES);

export function getTrade(tradeId?: string | null): TradeDefinition {
  if (tradeId && tradeId in TRADES) {
    return TRADES[tradeId as TradeId];
  }
  return TRADES.general;
}

export function normalizeTradeId(tradeId?: string | null): TradeId {
  if (tradeId && tradeId in TRADES) {
    return tradeId as TradeId;
  }
  return 'general';
}

export function inferTradeFromCategory(category?: string): TradeId {
  if (!category) return 'general';
  const lower = category.toLowerCase();
  if (['hardware', 'software', 'move', 'structured cabling', 'rack & move', 'access control & cctv'].includes(lower)) return 'it';
  for (const trade of TRADE_LIST) {
    if (trade.categories.some(c => c.toLowerCase() === lower)) {
      return trade.id;
    }
  }
  return 'general';
}
