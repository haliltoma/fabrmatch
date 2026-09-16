import numpy as np
import trimesh

from fabrmatch_geometry.analysis import overhang_mask
from fabrmatch_geometry.config import Settings
from fabrmatch_geometry.schemas import ManufacturabilityIssue, ManufacturabilityReport

MAX_WALL_SAMPLES = 2000
THIN_AREA_RATIO_THRESHOLD = 0.02
OVERHANG_WARNING_RATIO = 0.15
RAY_OFFSET_MM = 1e-3
SMALL_MODEL_MM = 2.0


def wall_thickness_samples(mesh: trimesh.Trimesh) -> tuple[np.ndarray, np.ndarray]:
    """Yüz merkezinden içeri (−normal) ışın atarak yerel duvar kalınlığını ölçer.

    Dönüş: (kalınlık_mm, yüz_alanı) — ışının hiçbir yere çarpmadığı yüzler hariç.
    """
    face_count = len(mesh.faces)
    rng = np.random.default_rng(0)
    if face_count > MAX_WALL_SAMPLES:
        faces = rng.choice(face_count, MAX_WALL_SAMPLES, replace=False, p=mesh.area_faces / mesh.area)
    else:
        faces = np.arange(face_count)

    directions = -mesh.face_normals[faces]
    origins = mesh.triangles_center[faces] + directions * RAY_OFFSET_MM
    locations, ray_index, _ = mesh.ray.intersects_location(origins, directions, multiple_hits=False)
    if len(ray_index) == 0:
        return np.empty(0), np.empty(0)

    distances = np.linalg.norm(locations - origins[ray_index], axis=1) + RAY_OFFSET_MM
    return distances, mesh.area_faces[faces[ray_index]]


def check(mesh: trimesh.Trimesh, settings: Settings) -> ManufacturabilityReport:
    issues: list[ManufacturabilityIssue] = []

    if len(mesh.faces) == 0:
        issues.append(
            ManufacturabilityIssue(code="empty_mesh", severity="error", message="file contains no geometry")
        )
        return ManufacturabilityReport(
            manufacturable=False, issues=issues, overhang_area_ratio=0.0, min_wall_thickness_mm=None
        )

    if not mesh.is_watertight:
        issues.append(
            ManufacturabilityIssue(
                code="mesh_not_watertight",
                severity="error",
                message="mesh has open edges; volume and slicing are unreliable",
            )
        )

    # Model yatakta döndürülebilir: sıralı boyutları sıralı yazıcı hacmiyle karşılaştır
    model_dims = sorted(mesh.extents, reverse=True)
    build_dims = sorted(settings.build_volume_mm, reverse=True)
    if any(m > b for m, b in zip(model_dims, build_dims, strict=True)):
        issues.append(
            ManufacturabilityIssue(
                code="exceeds_build_volume",
                severity="error",
                message="model does not fit the build volume in any axis-aligned orientation",
                measured=round(float(model_dims[0]), 2),
                threshold=build_dims[0],
            )
        )

    if max(mesh.extents) < SMALL_MODEL_MM:
        issues.append(
            ManufacturabilityIssue(
                code="very_small_model",
                severity="warning",
                message="model is smaller than 2 mm; check that units are millimetres",
                measured=round(float(max(mesh.extents)), 3),
                threshold=SMALL_MODEL_MM,
            )
        )

    thicknesses, areas = wall_thickness_samples(mesh)
    min_wall = round(float(thicknesses.min()), 3) if len(thicknesses) else None
    if len(thicknesses):
        thin = thicknesses < settings.min_wall_mm
        thin_ratio = float(areas[thin].sum() / areas.sum())
        if thin_ratio >= THIN_AREA_RATIO_THRESHOLD:
            below_nozzle = min_wall is not None and min_wall < settings.nozzle_mm
            issues.append(
                ManufacturabilityIssue(
                    code="wall_below_nozzle" if below_nozzle else "thin_walls",
                    severity="error" if below_nozzle else "warning",
                    message=(
                        "walls are thinner than the nozzle and cannot be printed"
                        if below_nozzle
                        else "some walls are thinner than the recommended minimum"
                    ),
                    measured=min_wall,
                    threshold=settings.nozzle_mm if below_nozzle else settings.min_wall_mm,
                )
            )

    overhang_ratio = float(
        mesh.area_faces[overhang_mask(mesh, settings.overhang_angle_deg)].sum() / mesh.area
    )
    if overhang_ratio > OVERHANG_WARNING_RATIO:
        issues.append(
            ManufacturabilityIssue(
                code="excessive_overhang",
                severity="warning",
                message="large overhanging area; heavy support material required",
                measured=round(overhang_ratio, 3),
                threshold=OVERHANG_WARNING_RATIO,
            )
        )

    return ManufacturabilityReport(
        manufacturable=not any(issue.severity == "error" for issue in issues),
        issues=issues,
        overhang_area_ratio=round(overhang_ratio, 3),
        min_wall_thickness_mm=min_wall,
    )
