import hmac
import time
from typing import Annotated

import httpx
from fastapi import APIRouter, Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError

from fabrmatch_geometry import analysis, manufacturability, pricing
from fabrmatch_geometry.config import Settings, get_settings
from fabrmatch_geometry.materials import Material
from fabrmatch_geometry.schemas import AnalysisResult, AnalyzeUrlRequest, PrintParams

SettingsDep = Annotated[Settings, Depends(get_settings)]


def require_service_key(settings: SettingsDep, x_service_key: Annotated[str | None, Header()] = None) -> None:
    if x_service_key is None or not hmac.compare_digest(x_service_key, settings.service_key):
        raise HTTPException(401, "invalid service key")


def print_params_form(
    material: Annotated[Material, Form()] = Material.PLA,
    infill_percent: Annotated[int, Form()] = 20,
    layer_height_mm: Annotated[float, Form()] = 0.2,
    quantity: Annotated[int, Form()] = 1,
) -> PrintParams:
    # Form modeli + File aynı uçta birleşmiyor; kısıtlar tek yerde (PrintParams) kalsın diye elle kurulur
    try:
        return PrintParams(
            material=material,
            infill_percent=infill_percent,
            layer_height_mm=layer_height_mm,
            quantity=quantity,
        )
    except ValidationError as exc:
        raise RequestValidationError(exc.errors()) from exc


app = FastAPI(title="Fabrmatch geometry service", version="0.1.0")
router = APIRouter(prefix="/v1", tags=["analysis"], dependencies=[Depends(require_service_key)])


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


def run_analysis(data: bytes, filename: str, params: PrintParams, settings: Settings) -> AnalysisResult:
    started = time.perf_counter()
    try:
        mesh = analysis.load_mesh(data, filename)
    except analysis.UnsupportedFileType as exc:
        raise HTTPException(415, str(exc)) from exc
    except analysis.MeshLoadError as exc:
        raise HTTPException(422, str(exc)) from exc
    if len(mesh.faces) == 0:
        raise HTTPException(422, "file contains no geometry")

    estimate = analysis.estimate_material(mesh, params, settings.overhang_angle_deg)
    return AnalysisResult(
        design_hash=analysis.design_hash(data),
        params=params,
        metrics=analysis.mesh_metrics(mesh),
        estimate=estimate,
        manufacturability=manufacturability.check(mesh, settings),
        cost=pricing.estimate_cost(estimate, params, settings),
        analysis_ms=round((time.perf_counter() - started) * 1000),
    )


# Senkron (def) uçlar: trimesh CPU-yoğun, threadpool'da çalışıp event loop'u bloklamasın.
@router.post("/analyze")
def analyze_upload(
    file: Annotated[UploadFile, File()],
    params: Annotated[PrintParams, Depends(print_params_form)],
    settings: SettingsDep,
) -> AnalysisResult:
    max_bytes = settings.max_upload_mb * 1024 * 1024
    data = file.file.read(max_bytes + 1)
    if len(data) > max_bytes:
        raise HTTPException(413, f"file exceeds {settings.max_upload_mb} MB")
    return run_analysis(data, file.filename or "", params, settings)


@router.post("/analyze-url")
def analyze_url(body: AnalyzeUrlRequest, settings: SettingsDep) -> AnalysisResult:
    """Sistem A'nın kısa ömürlü presigned URL'inden dosyayı çeker (09-API-SOZLESMESI)."""
    if body.file_url.host not in settings.allowed_file_hosts:
        raise HTTPException(400, "file host is not allowed")

    max_bytes = settings.max_upload_mb * 1024 * 1024
    chunks: list[bytes] = []
    size = 0
    try:
        with (
            httpx.Client(timeout=settings.download_timeout_s, follow_redirects=False) as client,
            client.stream("GET", str(body.file_url)) as response,
        ):
            if response.status_code != 200:
                raise HTTPException(502, f"file download failed with status {response.status_code}")
            for chunk in response.iter_bytes():
                size += len(chunk)
                if size > max_bytes:
                    raise HTTPException(413, f"file exceeds {settings.max_upload_mb} MB")
                chunks.append(chunk)
    except httpx.HTTPError as exc:
        raise HTTPException(502, "file download failed") from exc

    return run_analysis(b"".join(chunks), body.filename, body.params, settings)


app.include_router(router)
