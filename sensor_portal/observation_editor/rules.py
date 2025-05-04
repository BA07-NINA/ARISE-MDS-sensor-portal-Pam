from bridgekeeper import perms
from bridgekeeper.rules import R, always_allow
from data_models.models import DataFile
from django.db.models import Q
from utils.rules import check_super, final_query, query_super
from .models import Observation


class CanViewObservationDataFile(R):
    def check(self, user, instance=None):
        initial_bool = check_super(user)
        if initial_bool is not None:
            return initial_bool
        else:
            return perms['data_models.view_datafile'].filter(
                user, instance.data_files.all()).exists()

    def query(self, user):
        accumulated_q = query_super(user)
        if accumulated_q is not None:
            return accumulated_q
        else:
            accumulated_q = Q(data_files__in=perms['data_models.view_datafile'].filter(
                user, DataFile.objects.filter(observations__isnull=False)))
            return final_query(accumulated_q)


<<<<<<< HEAD
# Define permission to add observations - allow everyone to add
perms['observation_editor.add_observation'] = always_allow

# Define permission to change observations - allow everyone to edit
perms['observation_editor.change_observation'] = always_allow
=======
class CanAddObservation(R):
    def check(self, user, instance=None):
        # Check if superuser
        initial_bool = check_super(user)
        if initial_bool is not None:
            return initial_bool
>>>>>>> af16479c27a873e47753b91c23311762682520c5

        # Make sure the user has appropriate permissions to add observations to ALL
        # data files in the instance. If any file fails, they can't add observations.
        # This is where the issue was - previously it returned True if any file had permission
        if instance and hasattr(instance, 'data_files') and instance.data_files.exists():
            for data_file in instance.data_files.all():
                deployment = data_file.deployment
                if deployment:
                    # Check if the user has appropriate permissions for this data file
                    has_permission = (
                        deployment.project.filter(annotators=user).exists() or
                        deployment.project.filter(managers=user).exists() or
                        deployment.annotators.filter(pk=user.pk).exists() or
                        deployment.managers.filter(pk=user.pk).exists() or
                        deployment.device.annotators.filter(pk=user.pk).exists() or
                        deployment.device.managers.filter(pk=user.pk).exists()
                    )
                    # If they don't have permission for this file, return False immediately
                    if not has_permission:
                        return False
            # If they have permission for all files, return True
            return True
        return False

    def query(self, user):
        # Start with superuser check
        accumulated_q = query_super(user)
        if accumulated_q is not None:
            return accumulated_q

        # Build query for users with appropriate permissions
        accumulated_q = (
            Q(data_files__deployment__project__annotators=user) |
            Q(data_files__deployment__project__managers=user) |
            Q(data_files__deployment__annotators=user) |
            Q(data_files__deployment__managers=user) |
            Q(data_files__deployment__device__annotators=user) |
            Q(data_files__deployment__device__managers=user)
        )
        return final_query(accumulated_q)


class CanChangeObservation(R):
    def check(self, user, instance=None):
        # Check if superuser
        initial_bool = check_super(user)
        if initial_bool is not None:
            return initial_bool

        # Check if user is owner or project manager
        if instance:
            if instance.owner == user:
                return True
            for data_file in instance.data_files.all():
                if data_file.deployment.project.filter(managers=user).exists():
                    return True
        return False

    def query(self, user):
        # Start with superuser check
        accumulated_q = query_super(user)
        if accumulated_q is not None:
            return accumulated_q

        # Build query for owners and managers
        accumulated_q = (
            Q(owner=user) |
            Q(data_files__deployment__project__managers=user)
        )
        return final_query(accumulated_q)


class CanDeleteObservation(R):
    def check(self, user, instance=None):
        # Same as change permission
        initial_bool = check_super(user)
        if initial_bool is not None:
            return initial_bool

        if instance:
            if instance.owner == user:
                return True
            for data_file in instance.data_files.all():
                if data_file.deployment.project.filter(managers=user).exists():
                    return True
        return False

    def query(self, user):
        # Same as change permission
        accumulated_q = query_super(user)
        if accumulated_q is not None:
            return accumulated_q

        accumulated_q = (
            Q(owner=user) |
            Q(data_files__deployment__project__managers=user)
        )
        return final_query(accumulated_q)


# Register the permissions using rule classes
perms['observation_editor.add_observation'] = CanAddObservation()
perms['observation_editor.change_observation'] = CanChangeObservation()
perms['observation_editor.delete_observation'] = CanDeleteObservation()
perms['observation_editor.view_observation'] = CanViewObservationDataFile()

# Define permission to view taxa - allow everyone to view
perms['observation_editor.view_taxon'] = always_allow