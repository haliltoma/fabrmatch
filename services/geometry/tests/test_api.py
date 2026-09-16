from .conftest import SERVICE_KEY, box, stl_bytes

AUTH = {"X-Service-Key": SERVICE_KEY}


def upload(client, data: bytes, filename: str = "part.stl", headers=AUTH, **form):
    return client.post(
        "/v1/analyze",
        files={"file": (filename, data, "application/octet-stream")},
        data=form,
        headers=headers,
    )


def test_health(client):
    assert client.get("/health").json() == {"status": "ok"}


def test_analyze_requires_service_key(client):
    response = upload(client, stl_bytes(box(20, 20, 20)), headers={"X-Service-Key": "wrong"})

    assert response.status_code == 401


def test_analyze_returns_full_result(client):
    response = upload(client, stl_bytes(box(20, 20, 20)), material="PETG", infill_percent="30", quantity="4")

    assert response.status_code == 200
    body = response.json()
    assert len(body["design_hash"]) == 64
    assert body["params"]["material"] == "PETG"
    assert body["manufacturability"]["manufacturable"] is True
    assert body["estimate"]["slicer"].startswith("fabrmatch-mesh-estimator")
    assert body["cost"]["quantity"] == 4
    assert body["cost"]["total_cost"] == round(body["cost"]["unit_cost"] * 4, 2)


def test_analyze_validates_params(client):
    response = upload(client, stl_bytes(box(20, 20, 20)), infill_percent="150")

    assert response.status_code == 422


def test_analyze_rejects_unsupported_extension(client):
    assert upload(client, b"solid x", filename="part.step").status_code == 415


def test_analyze_rejects_unparseable_file(client):
    assert upload(client, b"definitely not a mesh").status_code == 422


def test_analyze_enforces_upload_limit(client, settings):
    settings.max_upload_mb = 0

    assert upload(client, stl_bytes(box(20, 20, 20))).status_code == 413


def test_analyze_url_blocks_unlisted_hosts(client):
    response = client.post(
        "/v1/analyze-url",
        json={"file_url": "https://attacker.example.com/part.stl", "filename": "part.stl"},
        headers=AUTH,
    )

    assert response.status_code == 400
