import pytest
from rest_framework.test import APIClient
from user_management.factories import UserFactory


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def api_client_with_credentials(db, api_client):
    user = UserFactory()
    api_client.force_authenticate(user=user)
    yield api_client
    try:
        api_client.force_authenticate(user=None)
    except:
        # Suppress transaction errors during logout
        pass