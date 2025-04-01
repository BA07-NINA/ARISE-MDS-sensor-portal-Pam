import datetime
from datetime import timedelta
import os
import tempfile

import pytest
from data_models.factories import (
    DataFileFactory,
    DataTypeFactory,
    DeploymentFactory,
    DeviceFactory,
    DeviceModelFactory,
    ProjectFactory,
    SiteFactory,
)
from django.conf import settings
from django.contrib.gis.geos import Point
from django.core.exceptions import ValidationError
from django.utils import timezone as djtimezone

from data_models.models import DataFile, Device, Project

# Project


@pytest.mark.django_db
def test_project_ID_create():
    """
    Test: On project creation, is a short ID automatically generated?
    """
    new_project = ProjectFactory(
        name="project_name_longer_than_10"
    )

    assert new_project.project_ID == "project_na"

# Site
# Is a short ID automatically generated


@pytest.mark.django_db
def test_site_shortname_create():
    """
    Test: On site creation, is a short ID automatically generated?
    """
    new_site = SiteFactory(
        name="project_name_longer_than_10"
    )

    assert new_site.short_name == "project_na"

# Device


@pytest.mark.django_db
def test_create_device_wrong_model():
    """
    Test: Can a device be created with a mismatch between the device type and the model device type?
    """

    type_1 = DataTypeFactory(name="data_type_1")
    type_2 = DataTypeFactory(name="data_type_2")

    new_device_model = DeviceModelFactory(
        type=type_1
    )
    with pytest.raises(ValidationError):
        DeviceFactory(
            type=type_2,
            model=new_device_model
        )


@pytest.mark.django_db
def test_deployment_from_date():
    """
    Test: Does the `deployment_from_date` function work?
    """

    new_device = DeviceFactory(type=None)
    deployment_1 = DeploymentFactory(device_type=None,
                                     device=new_device,
                                     deployment_start=datetime.datetime(
                                         1066, 1, 1),
                                     deployment_end=datetime.datetime(1066, 12, 31))
    deployment_2 = DeploymentFactory(device_type=None,
                                     device=new_device,
                                     deployment_start=datetime.datetime(
                                         1067, 1, 1),
                                     deployment_end=datetime.datetime(1067, 12, 31))
    deployment_3 = DeploymentFactory(device_type=None,
                                     device=new_device,
                                     deployment_start=datetime.datetime(
                                         1068, 1, 1),
                                     deployment_end=None)

    assert new_device.deployment_from_date("1066-06-06") == deployment_1
    assert new_device.deployment_from_date("1067-06-06") == deployment_2
    assert new_device.deployment_from_date("1068-06-06") == deployment_3

# DO A VERSION OF THIS TEST WITH TIME ZONES


@pytest.mark.django_db
def test_device_user_creation():
    """
    Test: Check if a device user is created on device creation.
    """
    new_device = DeviceFactory(type=None)
    assert new_device.managers.all().exists() is True


# Deployment
#
@pytest.mark.django_db
def test_overlapping_deployment_end_date():
    """
    Test: Check if overlapping deployments (where deployment has an end date) can be created (should fail).
    """
    new_device = DeviceFactory(type=None)
    DeploymentFactory(device_type=None,
                      device=new_device,
                      deployment_start=datetime.datetime(
                          1066, 1, 1),
                      deployment_end=datetime.datetime(1066, 12, 31))
    with pytest.raises(ValidationError):
        DeploymentFactory(device_type=None,
                          device=new_device,
                          deployment_start=datetime.datetime(
                              1066, 1, 1),
                          deployment_end=datetime.datetime(1067, 12, 31))


@pytest.mark.django_db
def test_overlapping_deployment_open():
    """
    Test: Check if overlapping deployments (where deployment is open) can be created (should fail).
    """
    new_device = DeviceFactory(type=None)
    DeploymentFactory(device_type=None,
                      device=new_device,
                      deployment_start=datetime.datetime(
                          1066, 1, 1),
                      deployment_end=None)
    with pytest.raises(ValidationError):
        DeploymentFactory(device_type=None,
                          device=new_device,
                          deployment_start=datetime.datetime(
                              1066, 1, 1),
                          deployment_end=datetime.datetime(1067, 12, 31))


@pytest.mark.django_db
def test_deployment_end_after_start():
    """
    Test: Check if deployment can end before it starts (should fail).
    """
    with pytest.raises(ValidationError):
        DeploymentFactory(device_type=None,
                          deployment_start=datetime.datetime(
                              1066, 1, 1),
                          deployment_end=datetime.datetime(
                              1065, 1, 1))


@pytest.mark.django_db
def test_global_project():
    """
    Test: Check if the global project is added to a deployment on creation and after editing.
    """
    new_deployment = DeploymentFactory(device_type=None, project=[])
    print("Check if globabl project exists after creation")
    assert new_deployment.project.all().exists() is True
    new_deployment.project.clear()
    new_deployment.save()
    print("Check if globabl project exists after edit")
    assert new_deployment.project.all().exists() is True


@pytest.mark.django_db
def test_combo_project():
    """
    Test: Check if combo project string is correctly generated.
    """
    new_project_1 = ProjectFactory(name="test_1")
    new_project_2 = ProjectFactory(name="test_2")

    new_deployment = DeploymentFactory(device_type=None, project=[])
    new_deployment.project.add(new_project_1)
    target_string_1 = (" ").join(
        [settings.GLOBAL_PROJECT_ID, new_project_1.project_ID])

    print("Check if combo project is correct on creation")
    assert new_deployment.combo_project == target_string_1

    new_deployment.project.add(new_project_2)
    target_string_2 = (" ").join(
        [settings.GLOBAL_PROJECT_ID, new_project_1.project_ID, new_project_2.project_ID])

    print("Check if combo project is correct on edit")
    assert new_deployment.combo_project == target_string_2

    new_deployment.project.clear()
    new_deployment.project.add(new_project_2)
    target_string_3 = (" ").join(
        [settings.GLOBAL_PROJECT_ID, new_project_2.project_ID])

    print("Check if combo project is correct after clear")
    assert new_deployment.combo_project == target_string_3


@pytest.mark.django_db
def test_lat_lon_to_point():
    """
    Test: Is spatial point generated from lat/lon fields.
    """
    new_deployment = DeploymentFactory(longitude=5, latitude=4.5)
    assert new_deployment.point.coords == (5, 4.5)


@pytest.mark.django_db
def test_point_to_lat_lon():
    """
    Test: Are lat/lon fields generated from point.
    """
    new_deployment = DeploymentFactory(point=Point(4.5, 5))
    assert (new_deployment.longitude == 4.5) & (new_deployment.latitude == 5)


@pytest.mark.django_db
def test_deployment_is_active():
    """
    Test: Is a deployment flagged as active correctly
    """
    # Create active deployment
    new_deployment = DeploymentFactory(device_type=None,
                                       deployment_start=djtimezone.now() - timedelta(seconds=60),
                                       deployment_end=None)

    assert new_deployment.is_active
    # Edit to make it inactive
    new_deployment.deployment_end = djtimezone.now() - timedelta(seconds=30)
    new_deployment.save()
    assert new_deployment.is_active is False
    # Create inactive
    new_deployment_2 = DeploymentFactory(device_type=None,
                                         deployment_start=datetime.datetime(
                                             1066, 1, 1),
                                         deployment_end=datetime.datetime(
                                             1067, 1, 1))
    assert new_deployment_2.is_active is False


@pytest.mark.django_db
def test_file_in_deployment():
    """
    Test: Can a file be created outside of the deployment time
    """
    new_deployment = DeploymentFactory(device_type=None,
                                       deployment_start=datetime.datetime(
                                           1066, 1, 1),
                                       deployment_end=datetime.datetime(
                                           1067, 1, 1))
    with pytest.raises(ValidationError):
        DataFileFactory(recording_dt=datetime.datetime(
            1068, 1, 1),
            deployment=new_deployment)

@pytest.mark.django_db
def test_device_folder_size():
    """
    Test: Does the get_folder_size method correctly calculate folder size in different units?
    """
    device = DeviceFactory()
    deployment = DeploymentFactory(device=device)
    
    # Create test files with different sizes
    DataFileFactory(deployment=deployment, file_size=1024 * 1024)  # 1MB in bytes
    DataFileFactory(deployment=deployment, file_size=2 * 1024 * 1024)  # 2MB in bytes
    
    assert device.get_folder_size() == 3  # 3MB
    assert device.get_folder_size(unit="KB") == 3 * 1024  # 3MB in KB
    assert device.get_folder_size(unit="GB") == 3 / 1024  # 3MB in GB

@pytest.mark.django_db
def test_device_last_upload():
    """
    Test: Does the get_last_upload method correctly return the most recent upload?
    """
    device = DeviceFactory()
    deployment = DeploymentFactory(device=device)
    
    # Create files with different upload times
    file1 = DataFileFactory(deployment=deployment, upload_dt=djtimezone.now() - timedelta(days=2))
    file2 = DataFileFactory(deployment=deployment, upload_dt=djtimezone.now() - timedelta(days=1))
    file3 = DataFileFactory(deployment=deployment, upload_dt=djtimezone.now())
    
    assert device.get_last_upload() == file3.upload_dt

@pytest.mark.django_db
def test_deployment_folder_size():
    """
    Test: Does the get_folder_size method correctly calculate folder size for a deployment?
    """
    deployment = DeploymentFactory()
    
    # Create test files with different sizes
    DataFileFactory(deployment=deployment, file_size=1024 * 1024)  # 1MB in bytes
    DataFileFactory(deployment=deployment, file_size=2 * 1024 * 1024)  # 2MB in bytes
    
    assert deployment.get_folder_size() == 3  # 3MB

@pytest.mark.django_db
def test_deployment_last_upload():
    """
    Test: Does the get_last_upload method correctly return the most recent upload for a deployment?
    """
    deployment = DeploymentFactory()
    
    # Create files with different upload times
    file1 = DataFileFactory(deployment=deployment, upload_dt=djtimezone.now() - timedelta(days=2))
    file2 = DataFileFactory(deployment=deployment, upload_dt=djtimezone.now() - timedelta(days=1))
    file3 = DataFileFactory(deployment=deployment, upload_dt=djtimezone.now())
    
    assert deployment.get_last_upload() == file3.upload_dt

@pytest.mark.django_db
def test_datafile_favourite_operations():
    """
    Test: Do the add_favourite and remove_favourite methods work correctly?
    """
    from django.contrib.auth import get_user_model
    User = get_user_model()
    
    user = User.objects.create_user(username='testuser', password='testpass')
    datafile = DataFileFactory()
    
    # Test adding favourite
    datafile.add_favourite(user)
    assert user in datafile.favourite_of.all()
    
    # Test removing favourite
    datafile.remove_favourite(user)
    assert user not in datafile.favourite_of.all()

@pytest.mark.django_db
def test_datafile_queryset_methods():
    """
    Test: Do the DataFileQuerySet methods work correctly?
    """
    deployment = DeploymentFactory(
        deployment_start=djtimezone.now() - timedelta(days=30),
        deployment_end=djtimezone.now() + timedelta(days=30)
    )
    
    # Create test files
    file1 = DataFileFactory(deployment=deployment, file_size=1024 * 1024, recording_dt=djtimezone.now() - timedelta(days=2))  # 1MB
    file2 = DataFileFactory(deployment=deployment, file_size=2 * 1024 * 1024, recording_dt=djtimezone.now() - timedelta(days=1))  # 2MB
    file3 = DataFileFactory(deployment=deployment, file_size=3 * 1024 * 1024, recording_dt=djtimezone.now())  # 3MB
    
    # Test file_size method
    assert deployment.files.file_size() == 6  # 6MB total
    
    # Test min_date and max_date methods
    assert deployment.files.min_date() == file1.recording_dt
    assert deployment.files.max_date() == file3.recording_dt

@pytest.mark.django_db
def test_project_is_active():
    """
    Test: Does the is_active method correctly identify active projects?
    """
    project = ProjectFactory()
    device = DeviceFactory()

    # Create inactive deployment in the past
    DeploymentFactory(device=device, project=[project], is_active=False,
                     deployment_start=djtimezone.now() - timedelta(days=180),
                     deployment_end=djtimezone.now() - timedelta(days=90))
    assert not project.is_active()

    # Create active deployment for current time
    DeploymentFactory(device=device, project=[project], is_active=True,
                     deployment_start=djtimezone.now() - timedelta(days=30),
                     deployment_end=djtimezone.now() + timedelta(days=30))
    assert project.is_active()


@pytest.mark.django_db
def test_device_is_active():
    """
    Test: Does the is_active method correctly identify active devices?
    """
    device = DeviceFactory()

    # Create inactive deployment in the past
    DeploymentFactory(device=device, is_active=False,
                     deployment_start=djtimezone.now() - timedelta(days=180),
                     deployment_end=djtimezone.now() - timedelta(days=90))
    assert not device.is_active()

    # Create active deployment for current time
    DeploymentFactory(device=device, is_active=True,
                     deployment_start=djtimezone.now() - timedelta(days=30),
                     deployment_end=djtimezone.now() + timedelta(days=30))
    assert device.is_active()

@pytest.mark.django_db
def test_datafile_clean_file():
    """
    Test: Does the clean_file method correctly handle file cleanup?
    """
    # Create a temporary file
    with tempfile.NamedTemporaryFile(delete=False) as temp_file:
        temp_file.write(b"test content")
        temp_path = temp_file.name
    
    # Create DataFile with the temporary file path
    datafile = DataFileFactory(
        local_path=os.path.dirname(temp_path),
        path="",
        file_name=os.path.splitext(os.path.basename(temp_path))[0],
        file_format=os.path.splitext(os.path.basename(temp_path))[1]
    )
    
    # Test clean_file with delete_obj=False
    datafile.clean_file(delete_obj=False)
    assert DataFile.objects.filter(id=datafile.id).exists()
    
    # Create another temporary file for the second test
    with tempfile.NamedTemporaryFile(delete=False) as temp_file:
        temp_file.write(b"test content")
        temp_path = temp_file.name
    
    datafile.local_path = os.path.dirname(temp_path)
    datafile.path = ""
    datafile.file_name = os.path.splitext(os.path.basename(temp_path))[0]
    datafile.file_format = os.path.splitext(os.path.basename(temp_path))[1]
    datafile.save()
    
    # Test clean_file with delete_obj=True
    datafile.clean_file(delete_obj=True)
    assert not DataFile.objects.filter(id=datafile.id).exists()

@pytest.mark.django_db
def test_deployment_check_dates():
    """
    Test: Does the check_dates method correctly validate deployment dates?
    """
    deployment = DeploymentFactory()
    
    # Test valid dates
    valid_dates = [
        deployment.deployment_start,
        deployment.deployment_start + timedelta(days=1)
    ]
    assert all(deployment.check_dates(valid_dates))  # All dates should be valid
    
    # Test invalid dates (before deployment start)
    invalid_dates = [
        deployment.deployment_start - timedelta(days=1),
        deployment.deployment_start - timedelta(days=2)
    ]
    assert not all(deployment.check_dates(invalid_dates))  # All dates should be invalid
