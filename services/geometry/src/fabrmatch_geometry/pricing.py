"""Üretim maliyet tabanı. Platform/üretici/satıcı marjları burada DEĞİL —
Sistem B maliyeti alıp teklif üretir, ödeme dağıtımı Sistem A'dadır (05-PRD)."""

from fabrmatch_geometry.config import Settings
from fabrmatch_geometry.materials import PROFILES
from fabrmatch_geometry.schemas import CostEstimate, MaterialEstimate, PrintParams


def estimate_cost(estimate: MaterialEstimate, params: PrintParams, settings: Settings) -> CostEstimate:
    profile = PROFILES[params.material]
    material_cost = estimate.total_weight_g / 1000 * profile.price_per_kg
    machine_cost = estimate.print_time_minutes / 60 * settings.machine_rate_per_hour
    unit_cost = round(material_cost + machine_cost, 2)
    return CostEstimate(
        currency=settings.currency,
        material_cost=round(material_cost, 2),
        machine_time_cost=round(machine_cost, 2),
        unit_cost=unit_cost,
        quantity=params.quantity,
        total_cost=round(unit_cost * params.quantity, 2),
    )
