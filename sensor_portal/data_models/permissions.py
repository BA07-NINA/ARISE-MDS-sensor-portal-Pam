from bridgekeeper import perms
from bridgekeeper.rules import is_active, is_authenticated, is_staff

from .rules import (
    CanManageDeploymentContainingDataFile,
    CanManageDeviceContainingDataFile,
    CanManageProjectContainingDataFile,
    CanManageProjectContainingDeployment,
    CanViewDeployedDevice,
    CanViewDeploymentContainingDataFile,
    CanViewDeviceContainingDataFile,
    CanViewProjectContainingDataFile,
    CanViewProjectContainingDeployment,
    CanViewProjectContainingDevice,
    IsManager,
    IsOwner,
    IsViewer,
)

# PROJECT
perms['data_models.add_project'] = is_authenticated & is_active
perms['data_models.change_project'] = is_authenticated & (is_staff
                                                          | IsOwner()
                                                          | IsManager()) & is_active  # must be project owner OR manager
perms['data_models.delete_project'] = is_authenticated & (
    is_staff | IsOwner()) & is_active  # must be project owner
perms['data_models.view_project'] = is_authenticated & (is_staff
                                                        | IsOwner()
                                                        | IsManager()  # project owner OR project manager
                                                        | IsViewer()  # OR in project group
                                                        ) & is_active  # deployment/device viewers don't need to see project objects?

# DEVICE
perms['data_models.add_device'] = is_authenticated & is_active
perms['data_models.change_device'] = is_authenticated & (is_staff
                                                         | IsOwner()
                                                         | IsManager()) & is_active  # must be deployment owner OR manager
perms['data_models.delete_device'] = is_authenticated & (is_staff
                                                         | IsOwner()) & is_active  # must be deployment owner
perms['data_models.view_device'] = is_authenticated & (is_staff
                                                       | IsOwner()
                                                       | IsManager()
                                                       | IsViewer()
                                                       | CanViewProjectContainingDevice()
                                                       ) & is_active  # deployment viewers don't need to see device?

# DEPLOYMENT
perms['data_models.add_deployment'] = is_authenticated & is_active
perms['data_models.change_deployment'] = is_authenticated & (is_staff
                                                             | IsOwner()
                                                             | IsManager()
                                                             ) & is_active  # must be device owner OR manager
perms['data_models.delete_deployment'] = is_authenticated & (is_staff
                                                             | IsOwner()
                                                             | CanManageProjectContainingDeployment()) & is_active  # must be device owner OR manager
perms['data_models.view_deployment'] = is_authenticated & (is_staff
                                                           | IsOwner()
                                                           | IsManager()
                                                           | IsViewer()
                                                           | CanManageProjectContainingDeployment()
                                                           | CanViewProjectContainingDeployment()
                                                           | CanViewDeployedDevice()
                                                           ) & is_active

# DATAFILES
perms['data_models.add_datafile'] = is_authenticated & is_active
perms['data_models.change_datafile'] = is_authenticated & (is_staff
                                                           | CanManageProjectContainingDataFile()
                                                           | CanManageDeploymentContainingDataFile()
                                                           | CanManageDeviceContainingDataFile()) & is_active
perms['data_models.delete_datafile'] = is_authenticated & (is_staff
                                                           | CanManageProjectContainingDataFile()
                                                           | CanManageDeploymentContainingDataFile()
                                                           | CanManageDeviceContainingDataFile()) & is_active
perms['data_models.view_datafile'] = is_authenticated & (is_staff
                                                         | CanManageProjectContainingDataFile()
                                                         | CanManageDeploymentContainingDataFile()
                                                         | CanManageDeviceContainingDataFile()
                                                         | CanViewProjectContainingDataFile()
                                                         | CanViewDeploymentContainingDataFile()
                                                         | CanViewDeviceContainingDataFile()) & is_active

# should check if a user can view a deployment at that site
perms['data_models.view_site'] = is_authenticated & is_active
perms['data_models.add_site'] = is_authenticated & is_active
perms['data_models.change_site'] = is_authenticated & is_staff
perms['data_models.delete_site'] = is_authenticated & is_staff

perms['data_models.view_datatype'] = is_authenticated & is_active
perms['data_models.add_datatype'] = is_authenticated & is_active
perms['data_models.change_datatype'] = is_authenticated & is_staff
perms['data_models.delete_datatype'] = is_authenticated & is_staff
