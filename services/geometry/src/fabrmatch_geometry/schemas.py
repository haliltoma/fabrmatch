from typing import Literal

from pydantic import BaseModel, Field, HttpUrl

from fabrmatch_geometry.materials import Material


class PrintParams(BaseModel):
    material: Material = Material.PLA
    infill_percent: int = Field(default=20, ge=5, le=100)
    layer_height_mm: float = Field(default=0.2, ge=0.08, le=0.32)
    quantity: int = Field(default=1, ge=1, le=10_000)


class MeshMetrics(BaseModel):
    triangle_count: int
    is_watertight: bool
    volume_cm3: float
    surface_area_cm2: float
    bounding_box_mm: tuple[float, float, float]


class MaterialEstimate(BaseModel):
    """06-PRD-TASARIM-SISTEMI malzeme verimliliği çubuğunun beslendiği dört veri + oran."""

    slicer: str
    part_weight_g: float
    support_weight_g: float
    total_weight_g: float
    material_efficiency_percent: float
    print_time_minutes: int


IssueCode = Literal[
    "empty_mesh",
    "mesh_not_watertight",
    "exceeds_build_volume",
    "wall_below_nozzle",
    "thin_walls",
    "excessive_overhang",
    "very_small_model",
]


class ManufacturabilityIssue(BaseModel):
    code: IssueCode
    severity: Literal["error", "warning"]
    message: str
    measured: float | None = None
    threshold: float | None = None


class ManufacturabilityReport(BaseModel):
    manufacturable: bool
    issues: list[ManufacturabilityIssue]
    overhang_area_ratio: float
    min_wall_thickness_mm: float | None


class CostEstimate(BaseModel):
    currency: str
    material_cost: float
    machine_time_cost: float
    unit_cost: float
    quantity: int
    total_cost: float


class AnalysisResult(BaseModel):
    design_hash: str
    params: PrintParams
    metrics: MeshMetrics
    estimate: MaterialEstimate
    manufacturability: ManufacturabilityReport
    cost: CostEstimate
    analysis_ms: int


class AnalyzeUrlRequest(BaseModel):
    file_url: HttpUrl
    filename: str = Field(pattern=r"(?i)^[\w.\- ]+\.(stl|obj)$")
    params: PrintParams = PrintParams()
