# Generated manually
import os
import librosa
from django.db import migrations
from django.conf import settings
from data_models.services.audio_quality import AudioQualityChecker

def seed_audio_metadata(apps, schema_editor):
    """
    Seed sample rates and file lengths for audio files
    """
    DataFile = apps.get_model('data_models', 'DataFile')
    DataType = apps.get_model('data_models', 'DataType')
    
    # Get audio file type
    audio_type = DataType.objects.filter(name='audio').first()
    if not audio_type:
        return
    
    # Get all audio files
    audio_files = DataFile.objects.filter(file_type=audio_type)
    
    for data_file in audio_files:
        try:
            # Get the local file path
            file_path = os.path.join(data_file.path, data_file.local_path, f"{data_file.file_name}{data_file.file_format}")
            
            if not os.path.exists(file_path):
                print(f"File not found: {file_path}")
                continue
            
            # Load audio file to get sample rate and duration
            y, sr = librosa.load(file_path)
            duration = librosa.get_duration(y=y, sr=sr)
            
            # Format duration as HH:MM:SS
            hours = int(duration // 3600)
            minutes = int((duration % 3600) // 60)
            seconds = int(duration % 60)
            file_length = f"{hours:02d}:{minutes:02d}:{seconds:02d}"
            
            # Update the data file
            data_file.sample_rate = sr
            data_file.file_length = file_length
            data_file.save()
            
            print(f"Updated metadata for {data_file.file_name}: sample_rate={sr}Hz, length={file_length}")
            
        except Exception as e:
            print(f"Error processing {data_file.file_name}: {str(e)}")

def reverse_seed_audio_metadata(apps, schema_editor):
    """
    Reverse the seeding of audio metadata
    """
    DataFile = apps.get_model('data_models', 'DataFile')
    DataType = apps.get_model('data_models', 'DataType')
    
    # Get audio file type
    audio_type = DataType.objects.filter(name='audio').first()
    if not audio_type:
        return
    
    # Reset sample rate and file length for all audio files
    DataFile.objects.filter(file_type=audio_type).update(
        sample_rate=None,
        file_length=None
    )

class Migration(migrations.Migration):
    dependencies = [
        ('data_models', '0020_load_initial_audio_data'),
    ]

    operations = [
        migrations.RunPython(
            seed_audio_metadata,
            reverse_seed_audio_metadata
        ),
    ] 