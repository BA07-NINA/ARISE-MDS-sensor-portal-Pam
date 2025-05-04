import pytest
from data_models.factories import DataFileFactory
from observation_editor.factories import ObservationFactory, TaxonFactory
from observation_editor.tasks import create_taxon_parents


@pytest.mark.django_db
def test_taxon_create():
    """
    Test: On taxon creation, is a GBIF taxon code found. 
    """
    new_taxon = TaxonFactory(
        species_name="homo sapiens"
    )

    assert new_taxon.taxon_code == 2436436

    assert new_taxon.taxon_source == 1

    assert new_taxon.species_common_name.lower() == "human"


@pytest.mark.django_db
def test_taxon_parent_create():
    """
    Test: Are parent taxons created and correct?
    """
    new_taxon = TaxonFactory(
        species_name="homo sapiens"
    )

    create_taxon_parents(new_taxon.pk)

    assert new_taxon.parents.exists()

    assert new_taxon.parents.all().filter(species_name="Animalia").exists()


@pytest.mark.django_db
def test_custom_taxon():
    """
    Test: Are non GBIF taxons handled correctly?
    """
    new_taxon = TaxonFactory(
        species_name="vehicle"
    )

    assert new_taxon.taxon_source == 0


@pytest.mark.django_db(transaction=True)
def test_observation_create():
    """
    Test: Are observation labels and defaults generated from datafiles correctly.
    """
    new_taxon = None
    new_data_file = None
    new_observation = None
    
    try:
        # Create test objects
        new_taxon = TaxonFactory(species_name="homo sapiens")
        new_data_file = DataFileFactory.create()
        
        # Create the observation
        new_observation = ObservationFactory(
            taxon=new_taxon,
            data_files=[new_data_file]
        )
        
        # Run assertions
        assert "sapiens" in new_observation.label
        assert new_observation.obs_dt == new_data_file.recording_dt
        
    finally:
        # Careful cleanup in reverse order of creation
        if new_observation:
            try:
                # Clear related objects first to avoid constraint violations
                if hasattr(new_observation, 'data_files'):
                    new_observation.data_files.clear()
                new_observation.delete()
            except Exception as e:
                print(f"Error cleaning up observation: {e}")
        
        if new_data_file:
            try:
                # If the file object exists on disk, remove it first
                if hasattr(new_data_file, 'full_path') and os.path.exists(new_data_file.full_path()):
                    try:
                        os.remove(new_data_file.full_path())
                    except:
                        pass
                # Then delete the database record
                new_data_file.delete()
            except Exception as e:
                print(f"Error cleaning up data file: {e}")
        
        if new_taxon:
            try:
                new_taxon.delete()
            except Exception as e:
                print(f"Error cleaning up taxon: {e}")
