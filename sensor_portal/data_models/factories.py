import os
from datetime import datetime, timedelta, tzinfo
from random import sample

import factory
import pytz
from django.conf import settings
from django.utils import timezone as djtimezone
from user_management.factories import UserFactory

from .general_functions import create_image
from .models import (DataFile, DataType, Deployment, Device, DeviceModel,
                     Project, Site)


class DataTypeFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = DataType
        django_get_or_create = ("name",)

    name = factory.Faker('random_element',
                         elements=["test_type_1", "test_type_2", "test_type_3"])


class SiteFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Site
        django_get_or_create = ("name",)

    name = factory.Faker('word')


class DeviceModelFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = DeviceModel
        django_get_or_create = ("name",)

    name = factory.Faker('word')
    type = factory.SubFactory(DataTypeFactory)


class DeviceFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Device
        django_get_or_create = ("device_ID",)

    device_ID = factory.Faker('word')
    name = factory.Faker('word')
    model = factory.SubFactory(DeviceModelFactory)
    type = None

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        """Override the default _create to call clean() before saving"""
        obj = model_class(*args, **kwargs)
        obj.clean()  # Run validation
        obj.save()
        return obj


class ProjectFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Project
        django_get_or_create = ("name",)

    name = factory.Faker('word')


class DeploymentFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Deployment
        django_get_or_create = (
            "deployment_ID", "device_type", "device_n")

    deployment_ID = factory.Faker('word')
    device_type = None
    device_n = factory.Sequence(lambda n: n + 1)

    @factory.lazy_attribute
    def deployment_start(self):
        # Get the latest deployment end date for this device
        if self.device and self.device.deployments.exists():
            latest_deployment = self.device.deployments.order_by('-deployment_end').first()
            if latest_deployment and latest_deployment.deployment_end:
                # Start this deployment after the last one ended
                return latest_deployment.deployment_end + timedelta(days=1)
        # If no previous deployments or they had no end date, start from a base date
        return datetime(2020, 1, 1, 0, 0, 0, tzinfo=djtimezone.utc)

    @factory.lazy_attribute
    def deployment_end(self):
        # End the deployment 30 days after it starts
        return self.deployment_start + timedelta(days=30)

    device = factory.SubFactory(DeviceFactory)
    site = factory.SubFactory(SiteFactory)

    @factory.post_generation
    def project(self, create, extracted, **kwargs):
        if not create:
            # Simple build do nothing.
            return
        if extracted:
            for current_project in extracted:
                self.project.add(current_project)
        elif extracted is None:
            for i in range(sample(range(3), 1)[0]):
                self.project.add(ProjectFactory())


class DataFileFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = DataFile
        django_get_or_create = (
            "file_name", "file_format")

    file_name = factory.Faker('word')
    file_size = factory.Faker('random_int', min=25, max=100000)
    file_format = ".JPG"  # factory.Faker('file_extension')
    upload_dt = djtimezone.now()

    deployment = factory.SubFactory(DeploymentFactory)

    recording_dt = factory.Faker('date_time_between_dates',
                                 datetime_start=factory.SelfAttribute(
                                     "..deployment.deployment_start"),
                                 datetime_end=factory.SelfAttribute(
                                     "..deployment.deployment_end"),
                                 tzinfo=djtimezone.utc
                                 )
    local_path = os.path.join(
        settings.FILE_STORAGE_ROOT)

    path = factory.LazyAttribute(lambda o: os.path.join("test",
                                                        o.deployment.deployment_device_ID, str(o.upload_dt.date())))

    @factory.post_generation
    def make_image(self, create, extracted, **kwargs):
        if not create:
            # Simple build do nothing.
            return
        else:
            os.makedirs(os.path.join(self.local_path,
                        self.path), exist_ok=True)
            test_image = create_image()
            test_image.save(self.full_path(), format="JPEG")
