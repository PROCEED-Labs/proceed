# rules for every package
package policies.common

import data.roles
import future.keywords.in
import future.keywords.every

default decision_strategy = "affirmative"

admin_permissions := 9007199254740991

guest_role_name := "@guest"
default_role_name := "@everyone"

global_roles := [guest_role_name, default_role_name]

# affirmative or unanimous (affirmative: at least one permission must evaluate to a positive decision; unanimous: all permissions must evaluate to a positive decision)
decision_strategy = input.decision_strategy

# ensures that permissions from input is always in form of an array
required_permissions = to_array(input.permission)

# gets default role from all roles
default_role = [role | role := roles[_]; role.name == default_role_name]

# gets guest role from all roles
guest_role = [role | role := roles[_]; role.name == guest_role_name]

# creates map of authenticated user permissions to resource using comprehensions https://www.openpolicyagent.org/docs/latest/policy-language/#comprehensions
user_permissions[resource] = permission {
	input.user
	filtered = array.concat([role | role := roles[input.user.roles[_]]; not role_expired(role)], [default_role[_]]) 
 	filtered[_].permissions[resource]
    permission := { permission | permission := filtered[_].permissions[resource] }
}

# creates map of guest user permissions to resource using comprehensions https://www.openpolicyagent.org/docs/latest/policy-language/#comprehensions
user_permissions[resource] = permission {
	not input.user
    guest_role[0].permissions[resource]
    permission := { permission | permission := guest_role[0].permissions[resource] }
}

is_super_admin {
	admin_permissions in user_permissions["All"]
}

# check if one of the required permissions is granted by at least one role
granted_by_role {
	decision_strategy == "affirmative"
	bits.and(user_permissions[input.resource][_], required_permissions[_]) > 0
}

granted_by_role {
	is_super_admin
}

# check if all of the required permissions is granted by at least one role
granted_by_role {
	decision_strategy == "unanimous"
    every permission in user_permissions[input.resource] {
		bits.and(user_permissions[input.resource][permission], required_permissions[permission]) > 0
	}
	#grants := {permission | permission := required_permissions[_]; bits.and(permission, user_permissions[input.resource][_]) > 0}
    #grants == {permission | permission := required_permissions[_]}
}

# function to check if role is expired
default role_expired(role) = false

role_expired(role) {
    time.now_ns() > time.parse_rfc3339_ns(role.expiration)
}

# ensures that permissions is always an array
to_array(x) = x { 
	is_array(x)
} else = [x]