# Generated manually
import os
import glob
import datetime
from django.db import migrations
from django.utils import timezone
from django.conf import settings

def get_audio_file_info(file_path):
    """
    Extract relevant information from audio file path
    """
    file_name = os.path.basename(file_path)
    file_size = os.path.getsize(file_path)
    file_format = os.path.splitext(file_name)[1]
    created_time = datetime.datetime.fromtimestamp(os.path.getctime(file_path), tz=timezone.utc)
    
    # Try to extract information from filename
    # Assuming format like: bugg_RPiID-10000000d2b4d01e_DATE_TIME_config
    parts = os.path.splitext(file_name)[0].split('_')
    
    # Default values
    recording_dt = created_time
    config = "default"
    sample_rate = 44100  # Standard audio sampling rate
    
    # Try to determine more info from filename if possible
    if len(parts) >= 4:
        try:
            date_str = parts[2]
            time_str = parts[3]
            if len(date_str) == 8 and len(time_str) >= 6:  # YYYYMMDD_HHMMSS
                year, month, day = int(date_str[:4]), int(date_str[4:6]), int(date_str[6:8])
                hour, minute, second = int(time_str[:2]), int(time_str[2:4]), int(time_str[4:6])
                recording_dt = datetime.datetime(year, month, day, hour, minute, second, tzinfo=timezone.utc)
        except (ValueError, IndexError):
            pass
        
        # Try to get config information if available
        if len(parts) > 4:
            config = parts[4]
            # Parse sample rate from config if possible (e.g., "16kHz")
            if "khz" in config.lower():
                try:
                    sample_rate = int(float(config.lower().replace("khz", "")) * 1000)
                except ValueError:
                    pass
    
    return {
        "file_name": os.path.splitext(file_name)[0],
        "file_format": file_format,
        "file_size": file_size,
        "recording_dt": recording_dt,
        "config": config,
        "sample_rate": sample_rate,
        "file_length": "00:03:00"  # Default length, would need audio processing to get actual length
    }

def load_initial_audio_data(apps, schema_editor):
    """
    Load initial data for NINA audio files
    """
    # Get the models
    DataType = apps.get_model('data_models', 'DataType')
    Site = apps.get_model('data_models', 'Site')
    DeviceModel = apps.get_model('data_models', 'DeviceModel')
    Device = apps.get_model('data_models', 'Device')
    Deployment = apps.get_model('data_models', 'Deployment')
    Project = apps.get_model('data_models', 'Project')
    DataFile = apps.get_model('data_models', 'DataFile')
    
    # Check Docker path first, then fall back to relative path
    docker_path = '/usr/src/proj_tabmon_NINA'
    relative_path = os.path.join(settings.BASE_DIR, '..', 'proj_tabmon_NINA')
    
    if os.path.exists(docker_path):
        base_dir = docker_path
        print(f"Using Docker path: {base_dir}")
    elif os.path.exists(relative_path):
        base_dir = relative_path
        print(f"Using relative path: {base_dir}")
    else:
        print(f"Audio files directory not found at {docker_path} or {relative_path}. Skipping audio file import.")
        return
    
    # If the directory doesn't exist, log a message and skip the migration
    if not os.path.exists(base_dir):
        print(f"Audio files directory not found at {base_dir}. Skipping audio file import.")
        return
    
    # Create data types if they don't exist
    audio_type, _ = DataType.objects.get_or_create(name='Audio')
    
    # Create site if it doesn't exist
    site, _ = Site.objects.get_or_create(
        name='NINA Field Site',
        short_name='NINA'
    )
    
    # Create project
    project, _ = Project.objects.get_or_create(
        project_ID='TABMON_NIN',  # 10 characters max
        defaults={
            'name': 'TABMON NINA',
            'objectives': 'Audio monitoring for NINA project',
            'principal_investigator': 'NINA',
            'principal_investigator_email': 'info@nina.no',
            'contact': 'NINA',
            'contact_email': 'info@nina.no',
            'organisation': 'NINA'
        }
    )
    
    # Create the AudioMoth device model
    device_model, _ = DeviceModel.objects.get_or_create(
        name='AudioMoth',
        defaults={
            'manufacturer': 'Open Acoustic Devices',
            'type': audio_type
        }
    )
    
    # Walk through the directory structure
    for item in os.listdir(base_dir):
        device_dir = os.path.join(base_dir, item)
        
        # Skip non-directories and hidden files
        if not os.path.isdir(device_dir) or item.startswith('.'):
            continue
            
        # Extract the device ID from the directory name
        if item.startswith('bugg_RPiID-'):
            device_id = item.split('-')[1]
        else:
            device_id = item
        
        # Create device if it doesn't exist
        device, _ = Device.objects.get_or_create(
            device_ID=device_id,
            defaults={
                'name': f'AudioMoth {device_id}',
                'model': device_model,  # Use the DeviceModel instance
                'type': audio_type
            }
        )
        
        # Create deployment if it doesn't exist, with only fields certain to exist
        try:
            deployment = Deployment.objects.get(deployment_ID=f'NINA_{device_id[:5]}')
            created = False
        except Deployment.DoesNotExist:
            # Use only core fields to avoid schema issues
            deployment = Deployment.objects.create(
                deployment_ID=f'NINA_{device_id[:5]}',
                device=device,
                site=site,
                device_type=audio_type,
                deployment_start=timezone.now() - datetime.timedelta(days=30)
            )
            created = True
        
        # Add project to deployment
        deployment.project.add(project)
        
        # Check for audio_files directory
        audio_dir = os.path.join(device_dir, 'audio_files')
        if not os.path.exists(audio_dir):
            audio_dir = device_dir  # Use the device directory if audio_files doesn't exist
        
        # Process audio files
        for audio_file in os.listdir(audio_dir):
            # Skip non-audio files
            if not audio_file.endswith(('.wav', '.WAV')):
                continue
                
            file_path = os.path.join(audio_dir, audio_file)
            file_size = os.path.getsize(file_path)
            file_name = os.path.splitext(audio_file)[0]
            file_ext = os.path.splitext(audio_file)[1]
            
            # Try to extract date from filename (format: bugg_RPiID-DEVICEID_YYYYMMDD_HHMMSS)
            try:
                # Split by underscore and extract date/time parts
                parts = file_name.split('_')
                if len(parts) >= 3:
                    date_part = parts[-2]  # YYYYMMDD
                    time_part = parts[-1].split('_')[0]  # HHMMSS (might have additional parts)
                    
                    # Handle config part (e.g., 16kHz)
                    config = None
                    if len(parts) >= 4:
                        config = parts[-1]
                    elif '_' in parts[-1]:
                        config = parts[-1].split('_')[1]
                    
                    # Extract sample rate if available
                    sample_rate = None
                    if config and 'kHz' in config:
                        try:
                            # Convert something like "16kHz" to 16000
                            sample_rate = int(float(config.replace('kHz', '')) * 1000)
                        except (ValueError, TypeError):
                            pass
                    
                    # Parse date and time
                    if len(date_part) == 8 and len(time_part) >= 6:
                        year = int(date_part[0:4])
                        month = int(date_part[4:6])
                        day = int(date_part[6:8])
                        
                        hour = int(time_part[0:2])
                        minute = int(time_part[2:4])
                        second = int(time_part[4:6])
                        
                        recording_dt = datetime.datetime(
                            year, month, day, hour, minute, second,
                            tzinfo=timezone.get_current_timezone()
                        )
                    else:
                        recording_dt = None
                else:
                    recording_dt = None
                    config = None
                    sample_rate = None
            except (ValueError, IndexError):
                recording_dt = None
                config = None
                sample_rate = None
            
            # Store paths in a way that works in Docker environment
            container_path = '/usr/src/proj_tabmon_NINA'
            
            # Create the data file if it doesn't exist
            if not DataFile.objects.filter(file_name=file_name).exists():
                try:
                    # Check for model structure compatibility
                    file_data = {
                        'deployment': deployment,
                        'file_type': audio_type,
                        'file_name': file_name,
                        'file_size': file_size,
                        'file_format': file_ext,
                        'recording_dt': recording_dt,
                        'path': container_path,
                        'local_path': os.path.dirname(os.path.relpath(file_path, base_dir)),
                    }
                    
                    # Store metadata in extra_data field which is more likely to exist
                    metadata = {}
                    if config:
                        metadata['config'] = config
                    if sample_rate:
                        metadata['sample_rate'] = sample_rate
                    
                    # Check if the field exists before setting it
                    model_fields = [f.name for f in DataFile._meta.get_fields()]
                    
                    if 'extra_data' in model_fields:
                        file_data['extra_data'] = metadata
                    
                    DataFile.objects.create(**file_data)
                except Exception as e:
                    print(f"Error creating data file {file_name}: {e}")

def reverse_func(apps, schema_editor):
    """
    No reverse operation needed
    """
    pass

class Migration(migrations.Migration):

    dependencies = [
        ('data_models', '0019_rename_archives_project_archive_and_more'),
    ]

    operations = [
        migrations.RunPython(load_initial_audio_data, reverse_func),
    ] 