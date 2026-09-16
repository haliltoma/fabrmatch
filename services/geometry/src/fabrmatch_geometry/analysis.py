"""Mesh tabanlı malzeme/süre tahmini.

Gerçek slicer (PrusaSlicer/CuraEngine) yerelde kurulu olmadığı için, dilimleme sonucunu
geometriden yaklaşık hesaplayan bir tahminci kullanılır. Model:
- kabuk hacmi   = yüzey alanı × kabuk kalınlığı (hacimle sınırlı)
- dolu hacim    = kabuk + (iç hacim × doluluk oranı)
- destek hacmi  = Σ(overhang yüz izdüşüm alanı × yataktan yüksekliği) × destek yoğunluğu
- baskı süresi  = ekstrüzyon hacmi / efektif akış + katman değişim ek süresi
"""

import hashlib
import io
import math

import numpy as np
import trimesh

from fabrmatch_geometry.materials import PROFILES
from fabrmatch_geometry.schemas import MaterialEstimate, MeshMetrics, PrintParams

SLICER_NAME = "fabrmatch-mesh-estimator/1.0"
SUPPORTED_EXTENSIONS = {"stl", "obj"}

SHELL_THICKNESS_MM = 0.9  # 2 perimetre × 0.45 mm hat genişliği
SUPPORT_DENSITY = 0.15
FLOW_EFFICIENCY = 0.45  # hızlanma, perimetre yavaşlığı, travel dahil ortalama
LAYER_CHANGE_SECONDS = 2.0
BED_EPSILON_MM = 0.05


class MeshLoadError(ValueError):
    pass


class UnsupportedFileType(MeshLoadError):
    pass


def design_hash(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def load_mesh(data: bytes, filename: str) -> trimesh.Trimesh:
    extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if extension not in SUPPORTED_EXTENSIONS:
        raise UnsupportedFileType(f"unsupported file type: .{extension}")
    try:
        mesh = trimesh.load_mesh(io.BytesIO(data), file_type=extension)
    except Exception as exc:  # trimesh farklı format hataları için farklı istisnalar fırlatır
        raise MeshLoadError("file could not be parsed as a mesh") from exc
    if isinstance(mesh, trimesh.Scene):
        mesh = mesh.to_mesh()
    return mesh


def overhang_mask(mesh: trimesh.Trimesh, overhang_angle_deg: float) -> np.ndarray:
    """Dikeyden `overhang_angle_deg`'den fazla eğimli, aşağı bakan ve yatağa oturmayan yüzler."""
    z_min = mesh.bounds[0][2]
    downward = mesh.face_normals[:, 2] < -math.sin(math.radians(overhang_angle_deg))
    above_bed = mesh.triangles_center[:, 2] > z_min + BED_EPSILON_MM
    return downward & above_bed


def mesh_metrics(mesh: trimesh.Trimesh) -> MeshMetrics:
    extents = mesh.extents if len(mesh.faces) else np.zeros(3)
    return MeshMetrics(
        triangle_count=len(mesh.faces),
        is_watertight=bool(mesh.is_watertight),
        volume_cm3=round(abs(float(mesh.volume)) / 1000, 3),
        surface_area_cm2=round(float(mesh.area) / 100, 3),
        bounding_box_mm=tuple(round(float(v), 2) for v in extents),
    )


def estimate_material(
    mesh: trimesh.Trimesh, params: PrintParams, overhang_angle_deg: float
) -> MaterialEstimate:
    profile = PROFILES[params.material]

    volume = abs(float(mesh.volume))
    shell_volume = min(volume, float(mesh.area) * SHELL_THICKNESS_MM)
    part_volume = shell_volume + (volume - shell_volume) * params.infill_percent / 100

    mask = overhang_mask(mesh, overhang_angle_deg)
    z_min = mesh.bounds[0][2]
    projected_area = mesh.area_faces[mask] * np.abs(mesh.face_normals[mask, 2])
    heights = mesh.triangles_center[mask, 2] - z_min
    support_volume = float(np.sum(projected_area * heights)) * SUPPORT_DENSITY

    part_weight = part_volume / 1000 * profile.density_g_cm3
    support_weight = support_volume / 1000 * profile.density_g_cm3
    total_weight = part_weight + support_weight

    layer_factor = min(params.layer_height_mm / 0.2, 1.5)
    effective_flow = profile.max_volumetric_speed_mm3_s * layer_factor * FLOW_EFFICIENCY
    layers = mesh.extents[2] / params.layer_height_mm
    seconds = (part_volume + support_volume) / effective_flow + layers * LAYER_CHANGE_SECONDS

    efficiency = 100.0 if total_weight == 0 else part_weight / total_weight * 100
    return MaterialEstimate(
        slicer=SLICER_NAME,
        part_weight_g=round(part_weight, 2),
        support_weight_g=round(support_weight, 2),
        total_weight_g=round(total_weight, 2),
        material_efficiency_percent=round(efficiency, 1),
        print_time_minutes=max(1, math.ceil(seconds / 60)),
    )
