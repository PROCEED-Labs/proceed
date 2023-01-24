# METADATA
# title: Share Policies
# description: Policies for PROCEED MS /api/shares REST API
# scope: package
# authors:
# - name: Kevin Hertwig
#   email: hertwig@campus.tu-berlin.de
package policies.share

import data.roles
import data.processes
import data.shares
import data.policies.common
import future.keywords.in

# METADATA
# title: Filter
# description: uses array comprehension to filter only shares of type user and link that are shared by requester
# scope: rule
# related_resources:
# - ref: https://www.openpolicyagent.org/docs/latest/policy-language/#array-comprehensions
# authors:
# - name: Kevin Hertwig
#   email: hertwig@campus.tu-berlin.de
filter = filtered {
	filtered = [share | share := shares[input.context.resourceType][input.context.resourceId][_]; user_or_link_share(share)]
}

# METADATA
# title: GET /api/shares & /api/shares/:id
# description: deny if resource is not shared with user and user is not owner of resource
# scope: rule
# authors:
# - name: Kevin Hertwig
#   email: hertwig@campus.tu-berlin.de
deny[msg] {
	input.method == "GET"
	not is_owner_or_shared
	msg := "denied because of missing permissions"
}

# METADATA
# title: POST /api/shares
# description: deny if missing permissions to add shares
# scope: rule
# authors:
# - name: Kevin Hertwig
#   email: hertwig@campus.tu-berlin.de
deny[msg] {
	input.method == "POST"
	not can_post
	msg := "denied because of missing permissions"
}

# METADATA
# title: PUT /api/shares/:id
# description: denies if requester wants to update share, but requester is not sharer and not owner of resource
# scope: rule
# authors:
# - name: Kevin Hertwig
#   email: hertwig@campus.tu-berlin.de
deny[msg] {
	input.method == "PUT"
	not is_owner_or_shared
	msg := "denied because of missing permissions"
}

# METADATA
# title: DELETE /api/shares/:id
# description: denies if requester wants to update share, but requester is not sharer and not owner of resource
# scope: rule
# authors:
# - name: Kevin Hertwig
#   email: hertwig@campus.tu-berlin.de
deny[msg] {
	input.method == "DELETE"
	not is_owner_or_shared
	msg := "denied because of missing permissions"
}

### helper functions ###

# METADATA
# title: User or Link Share
# description: detect if a share is a user or a link share
# scope: rule
# authors:
# - name: Kevin Hertwig
#   email: hertwig@campus.tu-berlin.de
user_or_link_share(share) {
	share.type == 0
}

user_or_link_share(share) {
	share.type == 2
	share.sharedBy == input.user.id
}

is_owner_or_shared = is_owner
is_owner_or_shared = is_shared
#is_owner_or_shared = is_guest
is_owner_or_shared = common.is_super_admin
is_owner_or_shared = has_admin_resource_permissions
is_owner_or_shared = is_share_owner

# METADATA
# title: Is Share Owner
# description: detect if user is owner of share and has sufficient permissions
# scope: rule
# authors:
# - name: Kevin Hertwig
#   email: hertwig@campus.tu-berlin.de
is_share_owner {
	input.path = ["shares", shareId]
	shares[input.context.resourceType][input.context.resourceId][_].id == shareId
	shares[input.context.resourceType][input.context.resourceId][_].sharedBy == input.user.id
	first_letter := upper(substring(input.context.resourceType, 0, 1))
	remaining := substring(input.context.resourceType, 1, -1)
	bits.and(common.user_permissions[concat("", [first_letter, remaining])][_], common.required_permissions[_]) > 0
}

# METADATA
# title: Is Owner
# description: checks if user is owner of resource and has sufficient permissions
# scope: rule
# authors:
# - name: Kevin Hertwig
#   email: hertwig@campus.tu-berlin.de
is_owner {
	process := processes[input.context.resourceId]
	input.user.id == process.owner
	first_letter := upper(substring(process.type, 0, 1))
	remaining := substring(process.type, 1, -1)
	bits.and(common.user_permissions[concat("", [first_letter, remaining])][_], common.required_permissions[_]) > 0
}

# METADATA
# title: Is Shared
# description: checks if resource is shared with user and is not expired and has enough permissions
# scope: rule
# authors:
# - name: Kevin Hertwig
#   email: hertwig@campus.tu-berlin.de
is_shared {
	share := shares[input.context.resourceType][input.context.resourceId][_]
	share.sharedWith == input.user.id
	bits.and(share.permissions, common.required_permissions[_]) > 0
	not share_expired(share)
}

# METADATA
# title: Is Guest
# description: checks if user is guest
# scope: rule
# authors:
# - name: Kevin Hertwig
#   email: hertwig@campus.tu-berlin.de
#is_guest {
#	not input.user
#}

# METADATA
# title: Is Guest
# description: checks if user has admin permissions for resource
# scope: rule
# authors:
# - name: Kevin Hertwig
#   email: hertwig@campus.tu-berlin.de
has_admin_resource_permissions {
	common.admin_permissions in common.user_permissions[input.context.resourceType]
}

# METADATA
# title: Can Post
# description: check if requester is resource owner or resource is shared and has sufficient permissions and requester doesn't share with himself
# scope: rule
# authors:
# - name: Kevin Hertwig
#   email: hertwig@campus.tu-berlin.de
can_post {
	is_owner_or_shared
	not input.body.sharedWith == processes[input.context.resourceId].owner
}

# METADATA
# title: Share Expired
# description: check if share is expired
# scope: rule
# authors:
# - name: Kevin Hertwig
#   email: hertwig@campus.tu-berlin.de
share_expired(share) = true {
    time.now_ns() > time.parse_rfc3339_ns(share.expiredAt)
}