from django.contrib import admin
from .models import DataType, Site, Device, Deployment, DataFile, Project, DeviceModel
from utils.general import get_global_project

# Register your models here.


@admin.register(DataType, DeviceModel)
class GenericAdmin(admin.ModelAdmin):
    readonly_fields = ['created_on', 'modified_on']


class AddOwnerAdmin(GenericAdmin):
    readonly_fields = ['owner']

    def save_model(self, request, obj, form, change):
        if obj.owner is None:
            obj.owner = request.user
        super().save_model(request, obj, form, change)


@admin.register(Site)
class SiteAdmin(GenericAdmin):
    list_display = ['short_name', 'name']
    search_fields = ['name', 'short_name']


@admin.register(Device)
class DeviceAdmin(AddOwnerAdmin):
    list_display = ['device_ID', 'type']
    search_fields = ['device_ID']
    list_filter = ['type']

    #  admin form hack to make sure device user is assigned to managers
    def save_related(self, request, form, formsets, change):
        super(AddOwnerAdmin, self).save_related(
            request, form, formsets, change)
        if form.instance.device_user:
            form.instance.device_user.save()


@admin.register(Project)
class ProjectAdmin(AddOwnerAdmin):
    list_display = ['project_ID', 'name']
    search_fields = ['project_ID', 'name']


@admin.register(Deployment)
class DeployAdmin(AddOwnerAdmin):
    list_display = ['deployment_device_ID', 'device_type',
                    'is_active', 'modified_on', 'combo_project']
    search_fields = ['deployment_device_ID']
    list_filter = ['is_active', 'device_type']
    readonly_fields = GenericAdmin.readonly_fields + \
        AddOwnerAdmin.readonly_fields + ['deployment_device_ID',
                                         'combo_project', 'device_type', 'is_active']
    autocomplete_fields = ('device', 'project')

    #  admin form hack to make sure global project is added
    def save_related(self, request, form, formsets, change):
        super(AddOwnerAdmin, self).save_related(
            request, form, formsets, change)
        global_project = get_global_project()
        if global_project not in form.instance.project.all():
            form.instance.project.add(global_project)


@admin.register(DataFile)
class FileAdmin(GenericAdmin):
    list_display = ['file_name', 'file_type', 'deployment',
                    'archived', 'local_storage', 'created_on']
    search_fields = ['filename']
    list_filter = ['archived', 'local_storage', 'file_type']
