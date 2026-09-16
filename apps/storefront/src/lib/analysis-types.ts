/** services/geometry (FastAPI) `/v1/analyze` yanıt şekli — src/fabrmatch_geometry/schemas.py ile birebir. */

export type ManufacturabilityIssue = {
  code: string;
  severity: 'error' | 'warning';
  message: string;
  measured: number | null;
  threshold: number | null;
};

export type PrintParams = {
  material: string;
  infill_percent: number;
  layer_height_mm: number;
  quantity: number;
};

export type AnalysisResult = {
  design_hash: string;
  params: PrintParams;
  metrics: {
    triangle_count: number;
    is_watertight: boolean;
    volume_cm3: number;
    surface_area_cm2: number;
    bounding_box_mm: [number, number, number];
  };
  estimate: {
    slicer: string;
    part_weight_g: number;
    support_weight_g: number;
    total_weight_g: number;
    material_efficiency_percent: number;
    print_time_minutes: number;
  };
  manufacturability: {
    manufacturable: boolean;
    issues: ManufacturabilityIssue[];
    overhang_area_ratio: number;
    min_wall_thickness_mm: number | null;
  };
  cost: {
    currency: string;
    material_cost: number;
    machine_time_cost: number;
    unit_cost: number;
    quantity: number;
    total_cost: number;
  };
  analysis_ms: number;
};
