from dataclasses import dataclass
from enum import StrEnum


class Material(StrEnum):
    PLA = "PLA"
    PETG = "PETG"
    ABS = "ABS"
    ASA = "ASA"
    TPU = "TPU"


@dataclass(frozen=True)
class MaterialProfile:
    density_g_cm3: float
    price_per_kg: float  # TRY — bkz. config.Settings.currency
    # 0.4 mm nozul için maksimum hacimsel akış (PrusaSlicer filament profillerine yakın değerler)
    max_volumetric_speed_mm3_s: float


PROFILES: dict[Material, MaterialProfile] = {
    Material.PLA: MaterialProfile(density_g_cm3=1.24, price_per_kg=550.0, max_volumetric_speed_mm3_s=15.0),
    Material.PETG: MaterialProfile(density_g_cm3=1.27, price_per_kg=650.0, max_volumetric_speed_mm3_s=10.0),
    Material.ABS: MaterialProfile(density_g_cm3=1.04, price_per_kg=600.0, max_volumetric_speed_mm3_s=12.0),
    Material.ASA: MaterialProfile(density_g_cm3=1.07, price_per_kg=750.0, max_volumetric_speed_mm3_s=12.0),
    Material.TPU: MaterialProfile(density_g_cm3=1.21, price_per_kg=950.0, max_volumetric_speed_mm3_s=3.5),
}
