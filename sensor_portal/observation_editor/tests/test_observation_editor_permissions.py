import pytest
from data_models.factories import (DataFileFactory, DeploymentFactory,
                                   ProjectFactory)
from observation_editor.factories import ObservationFactory
from observation_editor.models import Taxon

# Test no permission
# Owner, manager, annotator, viewer
# Project, deployment, device
# crud
# expected response
# update twice, general update, trying to link no perm file


def obs_crud_check(api_client_with_credentials, data_file_pk, existing_owned_observation_pk, existing_observation_pk,
                   expected_create_status, expected_read_status, expected_update_status, expected_reattach_status,
                   expected_delete_status):
    api_url = '/api/observation/'
    observation_api_url = f'/api/observation/{existing_observation_pk}/'
    owned_observation_api_url = f'/api/observation/{existing_owned_observation_pk}/'

    payload = {"data_files": [data_file_pk],
               "source": "human", "species_name": "homo sapiens"}
    print("add observation")
    response_create = api_client_with_credentials.post(
        api_url, data=payload, format="json")
    print(response_create.data)
    assert response_create.status_code == expected_create_status

    # Try to view existing observation
    response_get = api_client_with_credentials.get(
        observation_api_url, format="json")
    print(f"Response: {response_get.data}")
    assert response_get.status_code == expected_read_status

    # Try to edit existing observation
    response_patch = api_client_with_credentials.patch(
        observation_api_url, {'species_name': 'vulpes vulpes'}, format='json')
    print(f"Response patch: {response_patch.data}")
    assert response_patch.status_code == expected_update_status

    # Try to edit owned observation to attach to data_file
    response_patch_attach = api_client_with_credentials.patch(
        owned_observation_api_url, {'data_files': [data_file_pk]}, format='json')
    print(f"Response patch attach: {response_patch_attach.data}")
    assert response_patch_attach.status_code == expected_reattach_status

    # Try to delete existing observation
    response_delete = api_client_with_credentials.delete(
        observation_api_url)
    print(f"Response delete: {response_delete.data}")
    assert response_delete.status_code == expected_delete_status


def obs_crud_setup(api_client_with_credentials, permission_object=None, permission_level=None):
    user = api_client_with_credentials.handler._force_user

    # Create test taxonomies in advance to avoid ID conflicts during test
    if not Taxon.objects.filter(species_name__iexact='homo sapiens').exists():
        Taxon.objects.create(species_name='homo sapiens')
    vulpix_taxon = None
    if not Taxon.objects.filter(species_name__iexact='vulpix').exists():
        vulpix_taxon = Taxon.objects.create(species_name='vulpix')

    project = ProjectFactory()
    deployment = DeploymentFactory(project=[project])
    device = deployment.device

    object_dict = {"project": project,
                   "deployment": deployment, "device": device}

    if permission_object is not None and permission_level is not None:
        getattr(object_dict[permission_object], permission_level).add(user)

    data_file = DataFileFactory(deployment=deployment)
    
    # Explicitly set different taxonomies for observations
    if vulpix_taxon:
        existing_observation = ObservationFactory(data_files=[data_file], taxon=vulpix_taxon)
    else:
        existing_observation = ObservationFactory(data_files=[data_file])

    owned_project = ProjectFactory(owner=user)
    owned_deployment = DeploymentFactory(project=[owned_project])
    owned_data_file = DataFileFactory(deployment=owned_deployment)
    existing_owned_observation = ObservationFactory(
        data_files=[owned_data_file], owner=user)

    data_file_pk = data_file.pk
    existing_observation_pk = existing_observation.pk
    existing_owned_observation_pk = existing_owned_observation.pk
    return data_file_pk, existing_observation_pk, existing_owned_observation_pk


@pytest.mark.django_db
def test_no_permission(api_client_with_credentials):
    """
    Test: Check user cannot add an observation to a file attached to a project they cannot annotate, both at create and update.
    """
    data_file_pk, existing_observation_pk, existing_owned_observation_pk = obs_crud_setup(
        api_client_with_credentials)
    # Try to create observation on data_file
    expected_create_status = 403
    expected_read_status = 404
    expected_update_status = 404
    expected_reattach_status = 403
    expected_delete_status = 404

    obs_crud_check(api_client_with_credentials, data_file_pk, existing_owned_observation_pk, existing_observation_pk,
                   expected_create_status, expected_read_status, expected_update_status, expected_reattach_status,
                   expected_delete_status)


permission_objects = ["project", "deployment", "device"]
higher_permission_levels = ["annotators", "managers"]
combined_levels = [(x, y)
                   for x in permission_objects for y in higher_permission_levels]


@pytest.mark.parametrize("permission_object", permission_objects)
@pytest.mark.django_db
def test_viewer_permission(api_client_with_credentials, permission_object):
    """
    Test: Check user with viewer permission can view observations but not edit them.
    """
    # Create the taxonomy in advance
    if not Taxon.objects.filter(species_name__iexact='homo sapiens').exists():
        Taxon.objects.create(species_name='homo sapiens', species_common_name='human')
        
    data_file_pk, existing_observation_pk, existing_owned_observation_pk = obs_crud_setup(
        api_client_with_credentials, permission_object, "viewers")
    # Try to create observation on data_file
    expected_create_status = 403
    expected_read_status = 200
    expected_update_status = 403
    expected_reattach_status = 403
    expected_delete_status = 403

    obs_crud_check(api_client_with_credentials, data_file_pk, existing_owned_observation_pk, existing_observation_pk,
                   expected_create_status, expected_read_status, expected_update_status, expected_reattach_status,
                   expected_delete_status)


@pytest.mark.parametrize("permission_object,permission_level", combined_levels)
@pytest.mark.django_db
def test_annotator_permission(api_client_with_credentials, permission_object, permission_level):
    """
    Test: Check user with annotator or manager permission can add observations, and managers can edit.
    """
    # Create the taxonomy in advance
    if not Taxon.objects.filter(species_name__iexact='homo sapiens').exists():
        Taxon.objects.create(species_name='homo sapiens', species_common_name='human')
        
    data_file_pk, existing_observation_pk, existing_owned_observation_pk = obs_crud_setup(
        api_client_with_credentials, permission_object, permission_level)
    
    # Try to create observation on data_file
    expected_create_status = 201
    expected_read_status = 200
    
    # For update permissions: managers can edit non-owned observations, annotators cannot
    if permission_level == "managers":
        expected_update_status = 200
    else:
        expected_update_status = 403
        
    # Both managers and annotators can edit their own observations  
    expected_reattach_status = 200
    
    # Only managers can delete observations (and only the ones they own or in projects they manage)
    if permission_level == "managers" and permission_object == "project":
        expected_delete_status = 204  # HTTP 204 No Content is returned on successful delete
    else:
        expected_delete_status = 403

    obs_crud_check(api_client_with_credentials, data_file_pk, existing_owned_observation_pk, existing_observation_pk,
                   expected_create_status, expected_read_status, expected_update_status, expected_reattach_status,
                   expected_delete_status)