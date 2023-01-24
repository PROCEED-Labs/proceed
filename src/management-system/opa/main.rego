# general bitfield logic used in policies
#
# check if user has permission according to bitfields
# example: user has role x with permission { Role: 80 } and wants to delete (PERMISSION_DELETE = 8) role z
# user permission for roles in binary: 		1010000
# necessary delete permissions in binary:	   1000
# AND										0000000 -> not allowed

package main

applicable_policy := {
    "Role": "iam",
    "User": "iam",
    "Group": "iam",
    "Process": "process",
    "Machine": "machine",
    "Execution": "execution",
    "Share": "share"
}

# maps input to applicable_policy to get applicable package name
policy = applicable_policy[input.resource] {
	not input.resource == null
} else = applicable_policy[concat("", [upper(substring(input.path[0], 0, 1)), lower(substring(input.path[0], 1, count(input.path[0]) - 2))])]

router = data.policies[policy].deny # routes request to the correct package according to name

filter = data.policies[policy].filter # if request should be filtered, filter contains filtered items according to permissions (mostly for GET '/' requests)

# request denied if wrong input.resource
deny[msg] {
    not policy
    msg := sprintf("no applicable policy found for input.resource %v", [input.resource])
}

# request denied if package returns at least one deny
deny[msg] {
    policy := router
    msg := policy[_]
}

decision["allow"] = count(deny) == 0 # request allowed if no denies returned from package

# filtered items
decision["filter"] = filter {
    input.filter == true
}

# reason of deny
decision["reason"] = router {
    input.explain == true
}