# METADATA
# title: Machine Policies
# description: Policies for PROCEED MS /api/machines REST API
# scope: package
# authors:
# - name: Kevin Hertwig
#   email: hertwig@campus.tu-berlin.de
package policies.machine

import data.policies.common

# METADATA
# title: GET/POST/PUT/DELETE /api/machines(/*)
# description: deny if user has no role permissions
# scope: rule
# authors:
# - name: Kevin Hertwig
#   email: hertwig@campus.tu-berlin.de
deny[msg] {
	not common.granted_by_role
	msg := "denied because of missing permissions"
}