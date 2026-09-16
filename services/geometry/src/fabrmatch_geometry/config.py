from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="GEOMETRY_", env_file=".env", extra="ignore")

    # Sistem B → geometri servisi kimlik doğrulaması (09-API-SOZLESMESI: servisler arası anahtar)
    service_key: str = "dev-geometry-key"

    max_upload_mb: int = 50
    # Presigned URL indirmelerinde SSRF koruması: sadece bu host'lara istek atılır
    allowed_file_hosts: list[str] = ["localhost", "127.0.0.1"]
    download_timeout_s: float = 20.0

    # Varsayılan FDM yazıcı profili (Prusa MK4 sınıfı)
    build_volume_mm: tuple[float, float, float] = (250.0, 210.0, 220.0)
    nozzle_mm: float = 0.4
    min_wall_mm: float = 0.8
    overhang_angle_deg: float = 45.0

    # Fabrmatch TRY üzerinde çalışıyor (Sistem A/B) — bu tahmin de aynı para birimiyle gösterilir
    currency: str = "TRY"
    machine_rate_per_hour: float = 15.0


@lru_cache
def get_settings() -> Settings:
    return Settings()
