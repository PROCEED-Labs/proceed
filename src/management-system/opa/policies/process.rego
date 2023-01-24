# METADATA
# title: Process/Project/Template Policies
# description: Policies for PROCEED MS /api/process REST API
# scope: package
# authors:
# - name: Kevin Hertwig
#   email: hertwig@campus.tu-berlin.de
package policies.process

import data.roles
import data.processes
import data.shares
import data.policies.common
import future.keywords.in

# METADATA
# title: Filter
# description: uses array comprehension to filter processes based on ownership and sharing and afterwards saves permissions for the user in the process object via json.patch
# scope: rule
# related_resources:
# - ref: https://www.openpolicyagent.org/docs/latest/policy-language/#array-comprehensions
# - ref: https://www.openpolicyagent.org/docs/v0.38.0/policy-reference/#objects-2
# authors:
# - name: Kevin Hertwig
#   email: hertwig@campus.tu-berlin.de
filter = filtered {
	filtered = [json.patch(process, [{"op": "add", "path": "/permissions", "value": getPermission(process.id)}]) | process := processes[_]; is_owner_or_shared(process.id)]
}

# METADATA
# title: GET /api/process
# description: deny if user has no role permissions to view processes
# scope: rule
# authors:
# - name: Kevin Hertwig
#   email: hertwig@campus.tu-berlin.de
deny[msg] {
	input.method = "GET"
	input.path = ["process"]
	not can_view_process_or_project_or_template
	msg := "denied because of missing permissions"
}

# METADATA
# title: POST /api/process
# description: deny if user has no role permissions to create new processes
# scope: rule
# authors:
# - name: Kevin Hertwig
#   email: hertwig@campus.tu-berlin.de
deny[msg] {
	input.method = "POST"
	input.path = ["process"]
	not common.granted_by_role
	msg := "denied because of missing permissions"
}

# METADATA
# title: GET/PUT/DELETE /api/process/:id(/*)
# description: deny if not owner of process or process not shared with user when executing and request on process by id
# scope: rule
# authors:
# - name: Kevin Hertwig
#   email: hertwig@campus.tu-berlin.de
deny[msg] {
	[input.path[0], input.path[1]] = ["process", processId]
	not is_owner_or_shared(processId)
	msg := "denied because of missing permissions"
}

### helper functions ###

# METADATA
# title: Can View Process or Project or Template
# description: checks if requester can view any kind of processes or requester is super admin
# scope: rule
# authors:
# - name: Kevin Hertwig
#   email: hertwig@campus.tu-berlin.de
can_view_process_or_project_or_template {
	bits.and(common.user_permissions["Process"][_], common.required_permissions[_]) > 0
}

can_view_process_or_project_or_template {
	bits.and(common.user_permissions["Project"][_], common.required_permissions[_]) > 0
}

can_view_process_or_project_or_template {
	bits.and(common.user_permissions["Template"][_], common.required_permissions[_]) > 0
}

can_view_process_or_project_or_template {
	common.is_super_admin
}

default can_view(processId) = false

# METADATA
# title: Can View
# description: checks if requester can view any kind of processes or requester is super admin based on process id
# scope: rule
# authors:
# - name: Kevin Hertwig
#   email: hertwig@campus.tu-berlin.de
can_view(processId) {
	first_letter := upper(substring(processes[processId].type, 0, 1))
	remaining := substring(processes[processId].type, 1, -1)
    bits.and(common.user_permissions[concat("", [first_letter, remaining])][_], common.required_permissions[_]) > 0
}

# METADATA
# title: Is Owner or Shared
# description: checks if requester is owner of resource and has sufficient role permissions
# scope: rule
# authors:
# - name: Kevin Hertwig
#   email: hertwig@campus.tu-berlin.de
is_owner_or_shared(processId) {
	input.user.id == processes[processId].owner
	can_view(processId)
}

# METADATA
# title: Is Owner or Shared
# description: checks if requester is super admin
# scope: rule
# authors:
# - name: Kevin Hertwig
#   email: hertwig@campus.tu-berlin.de
is_owner_or_shared(processId) {
	processes[processId]
	common.is_super_admin
}

# METADATA
# title: Is Owner or Shared
# description: checks if requester has admin permissions on resource
# scope: rule
# authors:
# - name: Kevin Hertwig
#   email: hertwig@campus.tu-berlin.de
is_owner_or_shared(processId) {
	processes[processId]
	first_letter := upper(substring(processes[processId].type, 0, 1))
	remaining := substring(processes[processId].type, 1, -1)
	common.admin_permissions in common.user_permissions[concat("", [first_letter, remaining])]
}

# METADATA
# title: Is Owner or Shared
# description: checks if resource is shared with requester and requester has sufficient permissions
# scope: rule
# authors:
# - name: Kevin Hertwig
#   email: hertwig@campus.tu-berlin.de
is_owner_or_shared(processId) {
	processes[processId].owner # to filter out processes with no owner
	can_view(processId)
	shares["Process"][processId][input.user.id].sharedWith == input.user.id
	bits.and(shares["Process"][processId][input.user.id].permissions, common.required_permissions[_]) > 0
	not share_expired(shares["Process"][processId][input.user.id])
}

default getPermission(processId) = 0

# METADATA
# title: Get Permission
# description: gets permission from resources based on user permissions for filtering
# scope: rule
# authors:
# - name: Kevin Hertwig
#   email: hertwig@campus.tu-berlin.de
getPermission(processId) = permission { # get permission from admin if user is super admin
	common.is_super_admin
	permission := common.admin_permissions
} else = common.admin_permissions { # get admin permission if user has admin permissions
	first_letter := upper(substring(processes[processId].type, 0, 1))
	remaining := substring(processes[processId].type, 1, -1)
	common.admin_permissions in common.user_permissions[concat("", [first_letter, remaining])]
} else = sum(common.user_permissions[concat("", [first_letter, remaining])]) { # get permission from roles if user is owner
	input.user.id == processes[processId].owner
	first_letter := upper(substring(processes[processId].type, 0, 1))
	remaining := substring(processes[processId].type, 1, -1)
} else = shares["Process"][processId][input.user.id].permissions # get permission from share

# METADATA
# title: Share Expired
# description: checks if share for resource is expired
# scope: rule
# authors:
# - name: Kevin Hertwig
#   email: hertwig@campus.tu-berlin.de
share_expired(share) = true {
    time.now_ns() > time.parse_rfc3339_ns(share.expiredAt)
}