# Fabrmatch geometri servisi

STL/OBJ dosyasından malzeme ağırlığı, destek/atık ağırlığı, baskı süresi, üretilebilirlik
raporu ve üretim maliyet tabanı hesaplar. Sadece Sistem B (üretici ağı) tarafından çağrılır.
Bkz. `docs/03-PRD-URETICI-AGI.md`, `docs/09-API-SOZLESMESI.md`.

## Çalıştırma

```bash
uv sync
uv run fastapi dev        # http://127.0.0.1:8000/docs
uv run pytest
uv run ruff check . && uv run ruff format --check .
```

Ortam değişkenleri `GEOMETRY_` önekiyle okunur, bkz. `.env.example`.

## Uçlar

| Metot | Yol | Açıklama |
|---|---|---|
| GET | `/health` | Sağlık kontrolü |
| POST | `/v1/analyze` | Multipart dosya + `material`, `infill_percent`, `layer_height_mm`, `quantity` |
| POST | `/v1/analyze-url` | Sistem A presigned URL'inden indirir (host allowlist, boyut sınırı) |

`/v1/*` uçları `X-Service-Key` başlığı ister.

## Tahmin modeli

Gerçek slicer yerine mesh tabanlı tahminci (`fabrmatch-mesh-estimator/1.0`) kullanılır —
formüller `analysis.py` başındaki docstring'de. Üretilebilirlik kontrolleri: kapalı olmayan
mesh, yazıcı hacmi (döndürme dahil), nozülden ince duvar (hata) / önerilenden ince duvar
(uyarı, ışın örneklemesiyle), aşırı overhang (uyarı), 2 mm'den küçük model (uyarı).
