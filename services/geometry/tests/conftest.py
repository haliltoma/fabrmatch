import pytest
import trimesh
from fastapi.testclient import TestClient

from fabrmatch_geometry.config import Settings, get_settings
from fabrmatch_geometry.main import app

SERVICE_KEY = "test-key"


def box(x: float, y: float, z: float, z_offset: float = 0.0) -> trimesh.Trimesh:
    mesh = trimesh.creation.box(extents=(x, y, z))
    mesh.apply_translation((0, 0, z / 2 + z_offset))
    return mesh


def mushroom() -> trimesh.Trimesh:
    """İnce bir sap üzerinde geniş bir şapka — şapkanın altı büyük bir overhang."""
    return trimesh.util.concatenate([box(10, 10, 20), box(60, 60, 5, z_offset=20)])


def open_box() -> trimesh.Trimesh:
    closed = box(20, 20, 20)
    return trimesh.Trimesh(vertices=closed.vertices, faces=closed.faces[:-2], process=False)


def stl_bytes(mesh: trimesh.Trimesh) -> bytes:
    return mesh.export(file_type="stl")


@pytest.fixture
def settings() -> Settings:
    return Settings(service_key=SERVICE_KEY)


@pytest.fixture
def client(settings: Settings):
    app.dependency_overrides[get_settings] = lambda: settings
    yield TestClient(app)
    app.dependency_overrides.clear()
