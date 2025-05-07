import os
import shutil
import tempfile
from unittest.mock import patch

import pytest
from django.conf import settings

from data_models.management.commands.fake_gcs import FakeStorageClient, FakeGCSBucket, FakeGCSBlob


@pytest.fixture
def temp_dir():
    """Create a temporary directory for testing."""
    temp_dir = tempfile.mkdtemp()
    yield temp_dir
    shutil.rmtree(temp_dir)


@pytest.fixture
def fake_storage_client(temp_dir):
    """Create a fake storage client with a temporary directory."""
    return FakeStorageClient(base_dir=temp_dir)


@pytest.fixture
def fake_bucket(fake_storage_client):
    """Create a fake bucket for testing."""
    return fake_storage_client.bucket("test-bucket")


@pytest.fixture
def test_file(temp_dir):
    """Create a test file for upload/download operations."""
    file_path = os.path.join(temp_dir, "test.txt")
    with open(file_path, "w") as f:
        f.write("test content")
    return file_path


def test_fake_storage_client_initialization(temp_dir):
    """Test initialization of FakeStorageClient."""
    client = FakeStorageClient(base_dir=temp_dir)
    assert client.base_dir == temp_dir
    assert os.path.exists(temp_dir)


def test_fake_storage_client_bucket_creation(fake_storage_client):
    """Test bucket creation and retrieval."""
    bucket = fake_storage_client.bucket("test-bucket")
    assert isinstance(bucket, FakeGCSBucket)
    assert bucket.bucket_name == "test-bucket"
    assert os.path.exists(os.path.join(fake_storage_client.base_dir, "test-bucket"))


def test_fake_storage_client_list_buckets(fake_storage_client):
    """Test listing buckets."""
    # Create some buckets
    fake_storage_client.bucket("bucket1")
    fake_storage_client.bucket("bucket2")
    
    buckets = fake_storage_client.list_buckets()
    assert len(buckets) == 2
    assert all(isinstance(b, FakeGCSBucket) for b in buckets)
    assert {b.bucket_name for b in buckets} == {"bucket1", "bucket2"}


def test_fake_storage_client_list_device_buckets(fake_storage_client):
    """Test listing device buckets."""
    # Create some device buckets
    fake_storage_client.bucket("audio-files-device1")
    fake_storage_client.bucket("audio-files-device2")
    fake_storage_client.bucket("other-bucket")
    
    device_buckets = fake_storage_client.list_device_buckets("audio-files")
    assert len(device_buckets) == 2
    assert {b.bucket_name for b in device_buckets} == {"audio-files-device1", "audio-files-device2"}


def test_fake_gcs_bucket_blob_creation(fake_bucket):
    """Test blob creation in a bucket."""
    blob = fake_bucket.blob("test/file.txt")
    assert isinstance(blob, FakeGCSBlob)
    assert blob.name == "test/file.txt"
    assert os.path.exists(os.path.dirname(blob.full_path))


def test_fake_gcs_bucket_list_blobs(fake_bucket, test_file):
    """Test listing blobs in a bucket."""
    # Upload some files
    blob1 = fake_bucket.blob("file1.txt")
    blob1.upload_from_filename(test_file)
    blob2 = fake_bucket.blob("subdir/file2.txt")
    blob2.upload_from_filename(test_file)
    
    # List all blobs
    blobs = list(fake_bucket.list_blobs())
    assert len(blobs) == 2
    assert {b.name for b in blobs} == {"file1.txt", "subdir/file2.txt"}
    
    # List blobs with prefix
    blobs = list(fake_bucket.list_blobs(prefix="subdir/"))
    assert len(blobs) == 1
    assert blobs[0].name == "subdir/file2.txt"


def test_fake_gcs_blob_upload_download(fake_bucket, test_file):
    """Test blob upload and download operations."""
    blob = fake_bucket.blob("test.txt")
    
    # Upload
    assert blob.upload_from_filename(test_file)
    assert blob.exists()
    
    # Download
    download_path = os.path.join(os.path.dirname(test_file), "downloaded.txt")
    assert blob.download_to_filename(download_path)
    assert os.path.exists(download_path)
    with open(download_path, "r") as f:
        assert f.read() == "test content"


def test_fake_gcs_blob_delete(fake_bucket, test_file):
    """Test blob deletion."""
    blob = fake_bucket.blob("test.txt")
    blob.upload_from_filename(test_file)
    assert blob.exists()
    
    assert blob.delete()
    assert not blob.exists()


def test_fake_gcs_blob_metadata(fake_bucket, test_file):
    """Test blob metadata."""
    blob = fake_bucket.blob("test.txt")
    blob.upload_from_filename(test_file)
    
    metadata = blob.metadata
    assert "size" in metadata
    assert "updated" in metadata
    assert "contentType" in metadata
    assert metadata["contentType"] == "application/octet-stream"


def test_fake_gcs_blob_signed_url(fake_bucket, test_file):
    """Test generating signed URLs."""
    blob = fake_bucket.blob("test.txt")
    blob.upload_from_filename(test_file)
    
    signed_url = blob.generate_signed_url()
    assert signed_url == f"/file_storage/fake_gcs/{fake_bucket.bucket_name}/{blob.name}"
    
    # Test with expiration
    signed_url = blob.generate_signed_url(expiration=3600)
    assert signed_url == f"/file_storage/fake_gcs/{fake_bucket.bucket_name}/{blob.name}"


def test_fake_gcs_blob_public_url(fake_bucket, test_file):
    """Test getting public URLs."""
    blob = fake_bucket.blob("test.txt")
    blob.upload_from_filename(test_file)
    
    public_url = blob.public_url
    assert public_url == f"/file_storage/fake_gcs/{fake_bucket.bucket_name}/{blob.name}" 