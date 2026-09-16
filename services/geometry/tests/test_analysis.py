import pytest

from fabrmatch_geometry import analysis, manufacturability
from fabrmatch_geometry.materials import Material
from fabrmatch_geometry.schemas import PrintParams

from .conftest import box, mushroom, open_box, stl_bytes


def issue_codes(report) -> set[str]:
    return {issue.code for issue in report.issues}


def test_solid_box_weight_matches_shell_and_infill_model(settings):
    # 20 mm küp: hacim 8000 mm³, alan 2400 mm² → kabuk 2160 + iç 5840 × %20 = 3328 mm³ → PLA 4.13 g
    estimate = analysis.estimate_material(box(20, 20, 20), PrintParams(), settings.overhang_angle_deg)

    assert estimate.part_weight_g == pytest.approx(4.13, abs=0.01)
    assert estimate.support_weight_g == 0
    assert estimate.material_efficiency_percent == 100
    assert estimate.slicer == analysis.SLICER_NAME
    assert estimate.print_time_minutes >= 1


def test_denser_material_and_infill_increase_weight(settings):
    base = analysis.estimate_material(box(30, 30, 30), PrintParams(), settings.overhang_angle_deg)
    heavy = analysis.estimate_material(
        box(30, 30, 30), PrintParams(material=Material.PETG, infill_percent=60), settings.overhang_angle_deg
    )

    assert heavy.part_weight_g > base.part_weight_g
    assert heavy.print_time_minutes > base.print_time_minutes


def test_solid_box_is_manufacturable(settings):
    report = manufacturability.check(box(20, 20, 20), settings)

    assert report.manufacturable
    assert report.issues == []
    assert report.min_wall_thickness_mm == pytest.approx(20, abs=0.01)


def test_plate_thinner_than_nozzle_is_rejected(settings):
    report = manufacturability.check(box(40, 40, 0.3), settings)

    assert not report.manufacturable
    assert "wall_below_nozzle" in issue_codes(report)


def test_plate_thinner_than_recommended_is_a_warning(settings):
    report = manufacturability.check(box(40, 40, 0.6), settings)

    assert report.manufacturable
    assert "thin_walls" in issue_codes(report)


def test_overhang_needs_support_and_warns(settings):
    mesh = mushroom()
    report = manufacturability.check(mesh, settings)
    estimate = analysis.estimate_material(mesh, PrintParams(), settings.overhang_angle_deg)

    assert report.manufacturable
    assert "excessive_overhang" in issue_codes(report)
    assert estimate.support_weight_g > 0
    assert estimate.material_efficiency_percent < 100


def test_open_mesh_is_rejected(settings):
    report = manufacturability.check(open_box(), settings)

    assert not report.manufacturable
    assert "mesh_not_watertight" in issue_codes(report)


def test_model_larger_than_build_volume_is_rejected(settings):
    report = manufacturability.check(box(300, 50, 50), settings)

    assert not report.manufacturable
    assert "exceeds_build_volume" in issue_codes(report)


def test_model_that_fits_when_rotated_is_accepted(settings):
    # Yazıcı 250×210×220; model 215×240×10 sadece döndürülünce sığar
    report = manufacturability.check(box(215, 240, 10), settings)

    assert "exceeds_build_volume" not in issue_codes(report)


def test_stl_round_trip_and_unsupported_extension():
    data = stl_bytes(box(20, 20, 20))

    assert len(analysis.load_mesh(data, "part.STL").faces) == 12
    with pytest.raises(analysis.UnsupportedFileType):
        analysis.load_mesh(data, "part.step")
