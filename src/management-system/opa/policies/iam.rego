# METADATA
# title: IAM Policies
# description: Policies for PROCEED MS /api/roles, /api/users, /api/role-mappings REST API
# scope: package
# authors:
# - name: Kevin Hertwig
#   email: hertwig@campus.tu-berlin.de
package policies.iam

import data.roles
import data.policies.common
import future.keywords.in

# METADATA
# title: GET /api/users
# description: deny if user is unauthenticated
# scope: rule
# authors:
# - name: Kevin Hertwig
#   email: hertwig@campus.tu-berlin.de
deny[msg] {
	input.method == "GET"
	input.path = ["users"]
	not input.user
	msg := "denied because user is unauthenticated"
}

# METADATA
# title: GET /api/users/:id
# description: deny if user is unauthenticated
# scope: rule
# authors:
# - name: Kevin Hertwig
#   email: hertwig@campus.tu-berlin.de
deny[msg] {
	input.method == "GET"
	input.path = ["users", userId]
	not input.user
	msg := "denied because user is unauthenticated"
}

# METADATA
# title: POST /api/users
# description: deny if not granted by a role and requester is not requesting his own user resource and requester has no admin permissions
# scope: rule
# authors:
# - name: Kevin Hertwig
#   email: hertwig@campus.tu-berlin.de
deny[msg] {
	input.method == "POST"
	input.path = ["users"]
	permissions_not_granted
	msg := "denied because of missing permissions"
}

# METADATA
# title: PUT /api/users/:id
# description: deny if not granted by a role and requester is not requesting his own user resource and requester has no admin permissions
# scope: rule
# authors:
# - name: Kevin Hertwig
#   email: hertwig@campus.tu-berlin.de
deny[msg] {
	input.method == "PUT"
	input.path = ["users", userId]
	permissions_not_granted
	msg := "denied because of missing permissions"
}

# METADATA
# title: PUT /api/users/:id/update-password
# description: deny if requester requester is not requesting his own user resource
# scope: rule
# authors:
# - name: Kevin Hertwig
#   email: hertwig@campus.tu-berlin.de
deny[msg] {
	input.method == "PUT"
	input.path = ["users", userId, "update-password"]
	not userId == input.user.id
	msg := "denied because of missing permissions"
}

# METADATA
# title: DELETE /api/users/:id
# description: deny if not granted by a role and requester is not requesting his own user resource and requester has no admin permissions
# scope: rule
# authors:
# - name: Kevin Hertwig
#   email: hertwig@campus.tu-berlin.de
deny[msg] {
	input.method == "DELETE"
	input.path = ["users", userId]
	permissions_not_granted
	msg := "denied because of missing permissions"
}

# METADATA
# title: GET /api/roles
# description: deny if user is not authenticated
# scope: rule
# authors:
# - name: Kevin Hertwig
#   email: hertwig@campus.tu-berlin.de
deny[msg] {
	input.method == "GET"
	input.path = ["roles"]
	not input.user
	msg := "denied because user is unauthenticated"
}

# METADATA
# title: GET /api/roles/:id
# description: deny if user is not authenticated
# scope: rule
# authors:
# - name: Kevin Hertwig
#   email: hertwig@campus.tu-berlin.de
deny[msg] {
	input.method == "GET"
	input.path = ["roles", roleId]
	not input.user
	msg := "denied because user is unauthenticated"
}

# METADATA
# title: POST /api/roles
# description: deny if not granted by a role and requester is not requesting his own user resource and requester has no admin permissions
# scope: rule
# authors:
# - name: Kevin Hertwig
#   email: hertwig@campus.tu-berlin.de
deny[msg] {
	input.method == "POST"
	input.path = ["roles"]
	permissions_not_granted
	msg := "denied because of missing permissions"
}

# METADATA
# title: PUT /api/roles/:id
# description: deny if update role not allowed (see helper functions)
# scope: rule
# authors:
# - name: Kevin Hertwig
#   email: hertwig@campus.tu-berlin.de
deny[msg] {
	input.method == "PUT"
	input.path = ["roles", roleId]
	not update_role_allowed
	msg := "denied because of missing permissions"
}

# METADATA
# title: DELETE /api/roles/:id
# description: deny if delete role not allowed (see helper functions)
# scope: rule
# authors:
# - name: Kevin Hertwig
#   email: hertwig@campus.tu-berlin.de
deny[msg] {
	input.method == "DELETE"
	input.path = ["roles", roleId]
	not delete_role_allowed
	msg := "denied because of missing permissions"
}

# METADATA
# title: GET /api/role-mappings
# description: deny if not granted by a role and requester is not requesting his own user resource and requester has no admin permissions
# scope: rule
# authors:
# - name: Kevin Hertwig
#   email: hertwig@campus.tu-berlin.de
deny[msg] {
	input.method == "GET"
	input.path = ["role-mappings"]
	permissions_not_granted
	msg := "denied because of missing permissions"
}

# METADATA
# title: GET /api/role-mappings/users/:id
# description: deny if not granted by a role and requester is not requesting his own user resource and requester has no admin permissions
# scope: rule
# authors:
# - name: Kevin Hertwig
#   email: hertwig@campus.tu-berlin.de
deny[msg] {
	input.method == "GET"
	input.path = ["role-mappings", "users", userId]
	permissions_not_granted
	msg := "denied because of missing permissions"
}

# METADATA
# title: POST /api/role-mappings
# description: deny if add role mapping not allowed (see helper functions)
# scope: rule
# authors:
# - name: Kevin Hertwig
#   email: hertwig@campus.tu-berlin.de
deny[msg] {
	input.method == "POST"
	input.path = ["role-mappings"]
	not add_role_mapping_allowed
	msg := "denied because of missing permissions"
}

# METADATA
# title: DELETE /api/role-mappings
# description: deny if delete role mapping not allowed (see helper functions)
# scope: rule
# authors:
# - name: Kevin Hertwig
#   email: hertwig@campus.tu-berlin.de
deny[msg] {
	input.method == "DELETE"
	input.path = ["role-mappings", "users", userId, "roles", roleId]
	not delete_role_mapping_allowed
	msg := "denied because of missing permissions"
}

### helper functions ###

# METADATA
# title: Permission Not Granted
# description: check if permission is not granted by at least one role and user is not admin and user is not requesting his own resource
# scope: rule
# authors:
# - name: Kevin Hertwig
#   email: hertwig@campus.tu-berlin.de
permissions_not_granted {
	not granted_by_role
	not is_self
	not common.is_super_admin
}

# METADATA
# title: Granted By Role
# description: check if permission is granted by at least one role or if user is super admin
# scope: document
# authors:
# - name: Kevin Hertwig
#   email: hertwig@campus.tu-berlin.de
granted_by_role {
	bits.and(common.user_permissions[input.resource][_], common.required_permissions[_]) > 0
}

granted_by_role {
	common.is_super_admin
}

# METADATA
# title: Is Self
# description: check if requester is requesting his own resource depending on the path
# scope: document
# authors:
# - name: Kevin Hertwig
#   email: hertwig@campus.tu-berlin.de
is_self {
	input.path = ["users", userId]
	userId == input.user.id
}

is_self {
	input.path = ["role-mappings", "users", userId]
	userId == input.user.id
}

# METADATA
# title: Update Role Allowed
# description: check if requester is super admin or update is granted by a role
# scope: document
# authors:
# - name: Kevin Hertwig
#   email: hertwig@campus.tu-berlin.de
update_role_allowed {
	common.is_super_admin
}

update_role_allowed {
	granted_by_role
	not default_role_name_differs
	not default_attr_differs
	not set_expiration_not_allowed
	not missing_admin_permissions
}

# METADATA
# title: Default Role Name Differs
# description: check if requester tries to change the name of a default role
# scope: rule
# authors:
# - name: Kevin Hertwig
#   email: hertwig@campus.tu-berlin.de
default_role_name_differs {
	input.path = ["roles", roleId]
    roles[roleId]["default"] == true
    not input.body.name == roles[roleId].name
}

# METADATA
# title: Default Attribute Differs
# description: check if requester tries to change the default attribute of a default role
# scope: rule
# authors:
# - name: Kevin Hertwig
#   email: hertwig@campus.tu-berlin.de
default_attr_differs {
	input.path = ["roles", roleId]
    not roles[roleId]["default"] == input.body["default"]
}

# METADATA
# title: Set Expiration Not Allowed
# description: check if requester tries to set an expiration date for a default role
# scope: rule
# authors:
# - name: Kevin Hertwig
#   email: hertwig@campus.tu-berlin.de
set_expiration_not_allowed {
	input.path = ["roles", roleId]
    roles[roleId]["default"] == true
    not input.body.expiration == null
}

# METADATA
# title: Set Expiration Not Allowed
# description: check if requester tries to set an expiration date for an admin role without admin permissions
# scope: rule
# authors:
# - name: Kevin Hertwig
#   email: hertwig@campus.tu-berlin.de
set_expiration_not_allowed {
	input.path = ["roles", roleId]
    roles[roleId]["default"] == false
    not input.body.expiration == null
	not_has_admin_permissions(roles[roleId])
}

# METADATA
# title: Missing Admin Permissions
# description: this version checks if a requester has missing admin permission, when the requester wants to add admin permissions to a role
# scope: rule
# authors:
# - name: Kevin Hertwig
#   email: hertwig@campus.tu-berlin.de
missing_admin_permissions {
	input.path = ["roles", roleId]
	common.admin_permissions in input.body.permissions
	current_admin_permissions := {res | resource := roles[roleId].permissions[res]; resource == common.admin_permissions} # return all current admin permissions from role
	future_admin_permissions := {res | resource := input.body.permissions[res]; resource == common.admin_permissions} # return all admin permissions for role from body
	count(current_admin_permissions) < count(future_admin_permissions)
	changed := {res | resource := future_admin_permissions[res]; not resource in current_admin_permissions} # return all differences
    some resource in changed
	permission := object.get(common.user_permissions, resource, []) # get current user permissions for resource
	not common.admin_permissions in permission # check if current user permissions for resource is admin permission
}

# METADATA
# title: Missing Admin Permissions
# description: this version checks if a requester has missing admin permission, when the requester wants to remove admin permissions from a role
# scope: rule
# authors:
# - name: Kevin Hertwig
#   email: hertwig@campus.tu-berlin.de
missing_admin_permissions {
	input.path = ["roles", roleId]
	common.admin_permissions in input.body.permissions
	current_admin_permissions := {res | resource := roles[roleId].permissions[res]; resource == common.admin_permissions} # return all current admin permissions from role
	future_admin_permissions := {res | resource := input.body.permissions[res]; resource == common.admin_permissions} # return all admin permissions for role from body
	count(current_admin_permissions) > count(future_admin_permissions)
	changed := {res | resource := current_admin_permissions[res]; not resource in future_admin_permissions} # return all differences
    some resource in changed
	permission := object.get(common.user_permissions, resource, []) # get current user permissions for resource
	not common.admin_permissions in permission # check if current user permissions for resource is admin permission
}

# METADATA
# title: Not Has Admin Permissions
# description: checks if role contains admin permissions and user has not all admin permissions
# scope: rule
# authors:
# - name: Kevin Hertwig
#   email: hertwig@campus.tu-berlin.de
not_has_admin_permissions(role) = false {
	common.is_super_admin
} else = true {
    common.admin_permissions in role.permissions # check if role contains admin permissions
	resources := [res | resource := role.permissions[res]; resource == common.admin_permissions] # return all resources that include admin permissions
    some resource in resources
    permission := object.get(common.user_permissions, resource, []) # get current user permissions for resource
	not common.admin_permissions in permission # check if current user permissions for resource is admin permission
}

# METADATA
# title: Delete Role Allowed
# description: checks if delete role is granted by role and user has admin permissions in case they are needed
# scope: rule
# authors:
# - name: Kevin Hertwig
#   email: hertwig@campus.tu-berlin.de
delete_role_allowed {
	input.path = ["roles", roleId]
	role := roles[roleId]
	not role["default"] == true
	granted_by_role
	not not_has_admin_permissions(role)
}

# METADATA
# title: Add Role Mapping Allowed
# description: checks if add role-mapping is granted by role, role is not a global role and user has admin permissions in case they are needed
# scope: rule
# authors:
# - name: Kevin Hertwig
#   email: hertwig@campus.tu-berlin.de
add_role_mapping_allowed {
	input.path = ["role-mappings"]
	role := roles[input.body[_].roleId]
	not role.name in common.global_roles
	granted_by_role
	not not_has_admin_permissions(role)
}

# METADATA
# title: Delete Role Mapping Allowed
# description: checks if delete role-mapping is granted by role and user has admin permissions in case they are needed
# scope: rule
# authors:
# - name: Kevin Hertwig
#   email: hertwig@campus.tu-berlin.de
delete_role_mapping_allowed {
	input.path = ["role-mappings", "users", userId, "roles", roleId]
	role := roles[roleId]
	granted_by_role
	not not_has_admin_permissions(role)
}