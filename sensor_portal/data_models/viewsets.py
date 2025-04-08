import os

from django.conf import settings
from django.core.exceptions import ObjectDoesNotExist
from django.db.models import Q
from django.utils import timezone as djtimezone
from django.http import HttpResponse
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework_gis import filters as filters_gis
from utils.viewsets import (AddOwnerViewSetMixIn, CheckAttachmentViewSetMixIn,
                            CheckFormViewSetMixIn,
                            OptionalPaginationViewSetMixIn)

from .file_handling_functions import create_file_objects
from .filtersets import *
from .models import DataFile, DataType, Deployment, Device, Project, Site
from .permissions import perms
from .plotting_functions import get_all_file_metric_dicts
from .serializers import (DataFileSerializer, DataFileUploadSerializer,
                          DataTypeSerializer, DeploymentSerializer,
                          DeploymentSerializer_GeoJSON, DeviceSerializer,
                          ProjectSerializer, SiteSerializer)
from data_models.services.audio_quality import AudioQualityChecker



class DeploymentViewSet(CheckAttachmentViewSetMixIn, AddOwnerViewSetMixIn, CheckFormViewSetMixIn, OptionalPaginationViewSetMixIn):
    search_fields = ['deployment_device_ID',
                     'device__name', 'device__device_ID',
                     'coordinate_uncertainty', 'gps_device',
                     'habitat', 'protocol_checklist']
    ordering_fields = ordering = [
        'deployment_device_ID', 'created_on', 'device_type']
    queryset = Deployment.objects.all().distinct()
    filterset_class = DeploymentFilter
    filter_backends = viewsets.ModelViewSet.filter_backends + \
        [filters_gis.InBBoxFilter]
    def get_serializer_class(self):
        if 'geoJSON' in self.request.GET.keys():
            return DeploymentSerializer_GeoJSON
        else:
            return DeploymentSerializer

    @action(detail=False, methods=['post'])
    def upsert_deployment(self, request):
        data = request.data
        deployment_id = data.get('deployment_ID')
        if not deployment_id:
            return Response({"error": "deployment_ID is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        deployment_data = {
            'start_date': data.get('start_date'),
            'end_date': data.get('end_date'),
            'country': data.get('country'),
            'site_name': data.get('site_name'),
            'latitude': data.get('latitude'),
            'longitude': data.get('longitude'),
            'coordinate_uncertainty': data.get('coordinate_uncertainty'),
            'gps_device': data.get('gps_device'),
            'mic_height': data.get('mic_height'),
            'mic_direction': data.get('mic_direction'),
            'habitat': data.get('habitat'),
            'score': data.get('score'),
            'protocol_checklist': data.get('protocol_checklist'),
            'user_email': data.get('user_email'),
            'comment': data.get('comment'),
        }
        
        deployment, created = Deployment.objects.get_or_create(deployment_ID=deployment_id, defaults=deployment_data)
        if not created:
            serializer = DeploymentSerializer(deployment, data=deployment_data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        else:
            serializer = DeploymentSerializer(deployment)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['get'], url_path='by_site/(?P<site_name>[^/]+)')
    def by_site(self, request, site_name=None):
        if site_name is None:
            return Response({"error": "site_name is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        deployment = self.queryset.filter(site_name__iexact=site_name).first()
        
        if not deployment:
            return Response({"error": "Deployment not found"}, status=status.HTTP_404_NOT_FOUND)
        
        serializer = self.get_serializer(deployment)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'])
    def metrics(self, request, pk=None):
        deployment = self.get_object()
        user = request.user
        data_files = perms['data_models.view_datafile'].filter(
            user, deployment.files.all())
        if not data_files.exists():
            return Response({}, status=status.HTTP_200_OK)
        file_metric_dicts = get_all_file_metric_dicts(data_files)
        
        # Add folder size information
        file_metric_dicts['folder_size'] = deployment.get_folder_size()
        
        # Add last upload information
        last_upload = deployment.get_last_upload()
        if last_upload:
            file_metric_dicts['last_upload'] = last_upload
        
        return Response(file_metric_dicts, status=status.HTTP_200_OK)
        
    @action(detail=True, methods=['post'])
    def update_geo_info(self, request, pk=None):
        deployment = self.get_object()
        user = request.user
        
        if not user.has_perm('data_models.change_deployment', deployment):
            raise PermissionDenied("You don't have permission to update this deployment geo information")
            
        geo_fields = [
            'coordinate_uncertainty', 'gps_device', 'mic_height', 
            'mic_direction', 'habitat', 'protocol_checklist', 
            'score', 'comment'
        ]
        
        updates = {}
        for field in geo_fields:
            if field in request.data:
                updates[field] = request.data[field]
                
        # Update lat/long if provided
        if 'latitude' in request.data and 'longitude' in request.data:
            updates['latitude'] = request.data['latitude']
            updates['longitude'] = request.data['longitude']
                
        for key, value in updates.items():
            setattr(deployment, key, value)
            
        deployment.save()
        return Response(DeploymentSerializer(deployment).data, status=status.HTTP_200_OK)
        
    @action(detail=False, methods=['post'])
    def create_from_form(self, request):
        user = request.user
        
        data = request.data
        
        # Map form field names to model field names
        field_mapping = {
            'DeploymentID': 'deployment_ID',
            'Country': 'country',
            'Site': 'site_name',
            'StartDate': 'deployment_start',
            'EndDate': 'deployment_end',
            'Latitude': 'latitude',
            'Longitude': 'longitude',
            'Coordinate Uncertainty': 'coordinate_uncertainty',
            'GPS device': 'gps_device',
            'Microphone Height': 'mic_height',
            'Microphone Direction': 'mic_direction',
            'Habitat': 'habitat',
            'Score': 'score',
            'Protocol Checklist': 'protocol_checklist',
            'Adresse e-mail': 'user_email',
            'Comment/remark': 'comment'
        }
        
        # Create deployment data dictionary
        deployment_data = {}
        
        # Map form fields to model fields
        for form_field, model_field in field_mapping.items():
            if form_field in data:
                deployment_data[model_field] = data[form_field]
        
        # Handle active data if present
        if 'ActiveData' in data and isinstance(data['ActiveData'], dict):
            active_data = data['ActiveData']
            if 'batteryLevel' in active_data:
                deployment_data['battery_level'] = active_data['batteryLevel']
            # We no longer store last_upload or folder_size as they're calculated on-demand
        
        # Create serializer with the formatted data
        serializer = self.get_serializer(data=deployment_data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def check_attachment(self, serializer):
        project_objects = serializer.validated_data.get('project')
        if project_objects is not None:
            for project_object in project_objects:
                if (not self.request.user.has_perm('data_models.change_project', project_object)) and\
                        (project_object.name != settings.GLOBAL_PROJECT_ID):
                    raise PermissionDenied(
                        f"You don't have permission to add a deployment to {project_object.project_ID}")
        device_object = serializer.validated_data.get('device')
        if device_object is not None:
            if not self.request.user.has_perm('data_models.change_device', device_object):
                raise PermissionDenied(
                    f"You don't have permission to deploy {device_object.device_ID}")

    @action(detail=True, methods=['get'])
    def folder_size(self, request, pk=None):
        """
        Get the total size of all files in this deployment
        """
        deployment = self.get_object()
        
        # Get the unit if specified
        unit = request.query_params.get('unit', 'MB')
        
        folder_size = deployment.get_folder_size(unit)
        
        return Response({'folder_size': folder_size, 'unit': unit}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'])
    def last_upload(self, request, pk=None):
        """
        Get the datetime of the most recent file upload for this deployment
        """
        deployment = self.get_object()
        
        last_upload = deployment.get_last_upload()
        
        if last_upload:
            return Response({'last_upload': last_upload}, status=status.HTTP_200_OK)
        else:
            return Response({'last_upload': None}, status=status.HTTP_200_OK)


class ProjectViewSet(AddOwnerViewSetMixIn, OptionalPaginationViewSetMixIn):
    serializer_class = ProjectSerializer
    queryset = Project.objects.all().distinct()
    filterset_class = ProjectFilter
    search_fields = ['project_ID', 'name', 'organization']

    @action(detail=True, methods=['get'])
    def metrics(self, request, pk=None):
        project = self.get_object()
        user = request.user
        data_files = perms['data_models.view_datafile'].filter(
            user, DataFile.objects.filter(deployment__project=project))
        if not data_files.exists():
            return Response({}, status=status.HTTP_200_OK)
        file_metric_dicts = get_all_file_metric_dicts(data_files, False)
        return Response(file_metric_dicts, status=status.HTTP_200_OK)


class DeviceViewSet(AddOwnerViewSetMixIn, OptionalPaginationViewSetMixIn):
    serializer_class = DeviceSerializer
    queryset = Device.objects.all().distinct()
    filterset_class = DeviceFilter
    search_fields = ['device_ID', 'name', 'model__name', 'country', 'site_name', 'habitat']

    lookup_field = 'device_ID'          
    lookup_url_kwarg = 'device_ID'      

    @action(detail=False, methods=['post'])
    def upsert_device(self, request):
        data = request.data
        device_id = data.get('device_ID')
        if not device_id:
            return Response({"error": "device_ID is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        device_data = {
            'configuration': data.get('configuration'),
            'sim_card_icc': data.get('sim_card_icc'),
            'sim_card_batch': data.get('sim_card_batch'),
            'sd_card_size': data.get('sd_card_size'),
        }
        
        device, created = Device.objects.get_or_create(device_ID=device_id, defaults=device_data)
        if not created:
            serializer = DeviceSerializer(device, data=device_data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        else:
            serializer = DeviceSerializer(device)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], url_path='by_site/(?P<site_name>[^/]+)')
    def by_site(self, request, site_name=None):
        if not site_name:
            return Response({"error": "site_name is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        deployment = Deployment.objects.filter(site_name__iexact=site_name).first()
        if not deployment:
            return Response({"error": "No deployment found for site"}, status=status.HTTP_404_NOT_FOUND)
        
        device = deployment.device
        if not device:
            return Response({"error": "No device linked to the deployment"}, status=status.HTTP_404_NOT_FOUND)
        
        serializer = self.get_serializer(device)
        return Response(serializer.data, status=status.HTTP_200_OK)


    @action(detail=True, methods=['get'])
    def datafiles(self, request, device_ID=None):
   
        device = self.get_object()
        user = request.user

        datafiles_qs = DataFile.objects.filter(deployment__device=device)

        datafiles_qs = perms['data_models.view_datafile'].filter(user, datafiles_qs)

        serializer = DataFileSerializer(datafiles_qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['get'], url_path='datafiles/(?P<datafile_id>[^/.]+)')
    def datafile_detail(self, request, device_ID=None, datafile_id=None):
        device = self.get_object()
        user = request.user

        # Hent datafilen som er knyttet til en deployment som igjen tilhører device
        try:
            datafile = DataFile.objects.get(deployment__device=device, pk=datafile_id)
        except DataFile.DoesNotExist:
            return Response({"error": "DataFile not found."}, status=status.HTTP_404_NOT_FOUND)

        # Sjekk om brukeren har lov til å se datafilen (permissions)
        datafile_perm = perms['data_models.view_datafile'].filter(
            user, DataFile.objects.filter(pk=datafile_id)
        ).first()
        if not datafile_perm:
            raise PermissionDenied("You don't have permission to view this datafile")

        serializer = DataFileSerializer(datafile)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='datafiles/(?P<datafile_id>[^/.]+)/download')
    def download_datafile(self, request, device_ID=None, datafile_id=None):
        """Download a specific data file from a device"""
        device = self.get_object()
        user = request.user

        try:
            datafile = DataFile.objects.get(deployment__device=device, pk=datafile_id)
            if not datafile.path:
                return Response({"error": "File path not found."}, status=status.HTTP_404_NOT_FOUND)
        except DataFile.DoesNotExist:
            return Response({"error": "DataFile not found."}, status=status.HTTP_404_NOT_FOUND)

        if not perms['data_models.view_datafile'].filter(user, DataFile.objects.filter(pk=datafile_id)).first():
            raise PermissionDenied("You don't have permission to download this datafile")

        file_path = os.path.join(datafile.path, datafile.local_path, f"{datafile.file_name}{datafile.file_format}")
        
        if not os.path.exists(file_path):
            return Response({"error": f"File not found at {file_path}"}, status=status.HTTP_404_NOT_FOUND)
        
        try:
            with open(file_path, 'rb') as f:
                file_content = f.read()
                mime_type = 'audio/mpeg' if datafile.file_format.lower().replace('.', '') == 'mp3' else f"audio/{datafile.file_format.lower().replace('.', '')}"
                response = HttpResponse(file_content, content_type=mime_type)
                response['Content-Disposition'] = f'inline; filename="audio_file_{datafile_id}.{datafile.file_format.lower().replace(".", "")}"'
                response['Content-Length'] = len(file_content)
                response['Access-Control-Allow-Origin'] = request.headers.get('Origin', '*')
                response['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
                response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
                response['Access-Control-Allow-Credentials'] = 'true'
                return response
        except IOError as e:
            return Response({"error": f"Error reading file: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['get'])
    def metrics(self, request, pk=None):
        device = self.get_object()
        user = request.user
        data_files = perms['data_models.view_datafile'].filter(
            user, DataFile.objects.filter(deployment__device=device))
        if not data_files.exists():
            return Response({}, status=status.HTTP_200_OK)
        file_metric_dicts = get_all_file_metric_dicts(data_files)
        
        # Add folder size information
        file_metric_dicts['folder_size'] = device.get_folder_size()
        
        # Add last upload information
        last_upload = device.get_last_upload()
        if last_upload:
            file_metric_dicts['last_upload'] = last_upload
        
        return Response(file_metric_dicts, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        device = self.get_object()
        user = request.user
        
        if not user.has_perm('data_models.change_device', device):
            raise PermissionDenied("You don't have permission to update this device status")
            
        status_fields = ['battery_level']  # Removed last_upload and folder_size
        updates = {}
        
        for field in status_fields:
            if field in request.data:
                updates[field] = request.data[field]
                
        if 'start_date' in request.data:
            updates['start_date'] = request.data['start_date']
            
        if 'end_date' in request.data:
            updates['end_date'] = request.data['end_date']
        
        for key, value in updates.items():
            setattr(device, key, value)
            
        device.save()
        
        # Get response data with calculated fields
        response_data = DeviceSerializer(device).data
        response_data['folder_size'] = device.get_folder_size()
        
        # Add last upload information
        last_upload = device.get_last_upload()
        if last_upload:
            response_data['last_upload'] = last_upload
        
        return Response(response_data, status=status.HTTP_200_OK)
        
    @action(detail=True, methods=['post'])
    def update_device_info(self, request, pk=None):
        device = self.get_object()
        user = request.user

        if not user.has_perm('data_models.change_device', device):
            raise PermissionDenied("You don't have permission to update this device information")
            
        # Kun device-feltene
        device_fields = ['device_ID', 'configuration', 'sim_card_icc', 'sim_card_batch', 'sd_card_size']
        updates = {}
        for field in device_fields:
            if field in request.data:
                updates[field] = request.data[field]
        
        for key, value in updates.items():
            setattr(device, key, value)
            
        device.save()
        return Response(DeviceSerializer(device).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'])
    def create_from_json(self, request):
        user = request.user
        
        data = request.data
        
        # Map field names if needed
        device_data = {
            'device_ID': data.get('device_ID'),
            'name': data.get('name'),
            'comment': data.get('extra_data', {}).get('comment')
        }
        
        # Add model if provided
        if 'model_id' in data:
            device_data['model'] = data['model_id']
            
        # Handle any other mappings needed for your specific JSON format
        
        # Create serializer with the formatted data
        serializer = self.get_serializer(data=device_data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=True, methods=['get'])
    def folder_size(self, request, pk=None):
        """
        Get the total size of all files associated with this device
        """
        device = self.get_object()
        
        # Get the unit if specified
        unit = request.query_params.get('unit', 'MB')
        
        folder_size = device.get_folder_size(unit)
        
        return Response({'folder_size': folder_size, 'unit': unit}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'])
    def last_upload(self, request, pk=None):
        """
        Get the datetime of the most recent file upload for this device
        """
        device = self.get_object()
        
        last_upload = device.get_last_upload()
        
        if last_upload:
            return Response({'last_upload': last_upload}, status=status.HTTP_200_OK)
        else:
            return Response({'last_upload': None}, status=status.HTTP_200_OK)


class DataFileViewSet(CheckAttachmentViewSetMixIn, OptionalPaginationViewSetMixIn):

    queryset = DataFile.objects.all().distinct()
    filterset_class = DataFileFilter
    search_fields = ['file_name',
                     'deployment__deployment_device_ID',
                     'deployment__device__name',
                     'deployment__device__device_ID',
                     '=tag',
                     'config',
                     'sample_rate']
    
    @action(detail=False, methods=['get'])
    def filter_by_date(self, request):
        # Retrieve the query parameters: start_date and end_date
        start_date = request.GET.get('start_date', None)
        end_date = request.GET.get('end_date', None)
        
        # Validate the date format
        if start_date and end_date:
            try:
                start_date = djtimezone.datetime.strptime(start_date, '%m-%d-%Y')
                end_date = djtimezone.datetime.strptime(end_date, '%m-%d-%Y')
                
                # Add one day to end_date to include the entire end date
                end_date = end_date + djtimezone.timedelta(days=1)
            except ValueError:
                return Response({"error": "Invalid date format. Use MM-DD-YYYY."}, status=status.HTTP_400_BAD_REQUEST)
        else:
            return Response({"error": "Both start_date and end_date are required."}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get all data files from all devices within the date range in a single query
        result_queryset = DataFile.objects.filter(
            recording_dt__gte=start_date,
            recording_dt__lt=end_date
        )
        
        # Serialize and return the results
        serializer = self.get_serializer(result_queryset, many=True)
        return Response(serializer.data)
        
        
    @action(detail=False, methods=['get'])
    def test(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        # is this also filtering by permissions?
        print(self.filterset_class)
        print(queryset.count())
        return Response({queryset.count()}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], permission_classes=['data_models.view_datafile'])
    def favourite_file(self, request):
        data_file = self.get_object()
        user = request.user
        if user:
            if data_file.favourite_of.all().filter(pk=user.pk).exists():
                data_file.favourite_of.remove(user)
            else:
                data_file.favourite_of.add(user)
            return Response({}, status=status.HTTP_200_OK)
        else:
            return Response(status=status.HTTP_403_FORBIDDEN)

    @action(detail=True, methods=['post'])
    def update_audio_info(self, request, pk=None):
        data_file = self.get_object()
        user = request.user
        
        if not user.has_perm('data_models.change_datafile', data_file):
            raise PermissionDenied("You don't have permission to update this file information")
            
        audio_fields = ['config', 'sample_rate', 'file_length']
        
        updates = {}
        for field in audio_fields:
            if field in request.data:
                updates[field] = request.data[field]
                
        for key, value in updates.items():
            setattr(data_file, key, value)
            
        data_file.save()
        return Response(DataFileSerializer(data_file).data, status=status.HTTP_200_OK)
        
    @action(detail=False, methods=['post'])
    def register_audio_files(self, request):
        """
        Register audio files for a device or deployment
        """
        user = request.user
        
        # Get deployment or device
        deployment_id = request.data.get('deployment_id')
        device_id = request.data.get('device_id')
        
        try:
            if deployment_id:
                deployment = Deployment.objects.get(pk=deployment_id)
                if not user.has_perm('data_models.change_deployment', deployment):
                    raise PermissionDenied("You don't have permission to add files to this deployment")
            elif device_id:
                device = Device.objects.get(pk=device_id)
                if not user.has_perm('data_models.change_device', device):
                    raise PermissionDenied("You don't have permission to add files to this device")
                # Get active deployment for device
                deployment = device.deployments.filter(is_active=True).first()
                if not deployment:
                    return Response({"error": "No active deployment found for this device"}, 
                                    status=status.HTTP_400_BAD_REQUEST)
            else:
                return Response({"error": "Must provide either deployment_id or device_id"}, 
                                status=status.HTTP_400_BAD_REQUEST)
        except (Deployment.DoesNotExist, Device.DoesNotExist):
            return Response({"error": "Invalid deployment or device ID"}, 
                            status=status.HTTP_404_NOT_FOUND)
                
        # Get audio files from request
        audio_files = request.data.get('audioFiles', [])
        if not audio_files:
            return Response({"error": "No audio files provided"}, 
                            status=status.HTTP_400_BAD_REQUEST)
        
        # Process each audio file
        created_files = []
        for audio_file in audio_files:
            file_data = {
                'deployment': deployment.id,
                'file_name': audio_file.get('id'),
                'config': audio_file.get('config'),
                'sample_rate': audio_file.get('samplerate'),
                'file_length': audio_file.get('fileLength'),
                'file_size': audio_file.get('fileSize'),
                'file_format': '.wav'  # Default format - adjust as needed
            }
            
            serializer = DataFileSerializer(data=file_data)
            if serializer.is_valid():
                serializer.save()
                created_files.append(serializer.data)
            else:
                # Return errors for this file
                return Response({"error": f"Invalid file data: {serializer.errors}"}, 
                                status=status.HTTP_400_BAD_REQUEST)
        
        return Response({"created_files": created_files}, status=status.HTTP_201_CREATED)

    def check_attachment(self, serializer):
        deployment_object = serializer.validated_data.get(
            'deployment', serializer.instance.deployment)
        if not self.request.user.has_perm('data_models.change_deployment', deployment_object):
            raise PermissionDenied(f"You don't have permission to add a datafile"
                                   f" to {deployment_object.deployment_device_ID}")

    def get_serializer_class(self):
        if self.action == 'create':
            return DataFileUploadSerializer
        else:
            return DataFileSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        headers = self.get_success_headers(serializer.validated_data)

        instance = serializer.validated_data

        files = instance.get('files')
        recording_dt = instance.get('recording_dt')
        extra_data = instance.get('extra_data')
        deployment_object = instance.get('deployment_object')
        device_object = instance.get('device_object')
        data_types = instance.get('data_types')
        check_filename = instance.get('check_filename')

        uploaded_files, invalid_files, existing_files, status_code = create_file_objects(
            files, check_filename, recording_dt, extra_data, deployment_object, device_object, data_types, self.request.user)

        print([x.pk for x in uploaded_files])

        if status_code == status.HTTP_201_CREATED:
            returned_data = DataFileSerializer(data=uploaded_files, many=True)
            returned_data.is_valid()
            uploaded_files = returned_data.data

        return Response({"uploaded_files": uploaded_files, "invalid_files": invalid_files, "existing_files": existing_files},
                        status=status_code, headers=headers)

    @action(detail=True, methods=['post'])
    def check_quality(self, request, pk=None):
        """
        Trigger quality check for an audio file
        """
        data_file = self.get_object()
        user = request.user
        
        if not user.has_perm('data_models.change_datafile', data_file):
            raise PermissionDenied("You don't have permission to check quality for this file")
            
        try:
            quality_data = AudioQualityChecker.update_file_quality(data_file)
            return Response(quality_data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['get'])
    def quality_status(self, request, pk=None):
        """
        Get the current quality check status for a file
        """
        data_file = self.get_object()
        return Response({
            'status': data_file.quality_check_status,
            'score': data_file.quality_score,
            'issues': data_file.quality_issues,
            'last_check': data_file.quality_check_dt
        })


class SiteViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = SiteSerializer
    queryset = Site.objects.all().distinct()
    search_fields = ['name', 'short_name']


class DataTypeViewset(viewsets.ReadOnlyModelViewSet):
    serializer_class = DataTypeSerializer
    queryset = DataType.objects.all().distinct()
    search_fields = ['name']
    filterset_class = DataTypeFilter

