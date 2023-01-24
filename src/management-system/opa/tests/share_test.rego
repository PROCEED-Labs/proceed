# opa test -v main.rego ./tests/share_test.rego ./policies/common.rego ./policies/share.rego ./mocks
# opa test -v --coverage --format=json main.rego ./tests/share_test.rego ./policies/common.rego ./policies/share.rego ./mocks

# METADATA
# title: Share Policies Tests
# description: Tests for PROCEED MS /api/shares REST API
# scope: package
# authors:
# - name: Kevin Hertwig
#   email: hertwig@campus.tu-berlin.de
package share_test

import data.main
import data.mocks.shares
import data.mocks.roles
import data.mocks.users
import data.mocks.processes

# GET /api/shares

test_get_shares_admin {
	print("Test: Ensure that users can view PROCEED shares from resource, because user is admin.")
	main.decision == {
		"allow": true,
	} with input as {
		"user": users.admin,
		"method": "GET",
		"path": ["shares"],
		"permission": 32,
        "context": {
            "resourceId": "_932350bb-5a00-415c-a4de-90629389a0e1",
            "resourceType": "Process"
        }
	} with data.roles as roles.roles with data.processes as processes.processes with data.shares as shares.shares
}

test_get_shares_resource_owner_granted {
	print("Test: Ensure that users can view PROCEED shares from resource, because user owns the resource and has permissions from roles.")
	main.decision == {
		"allow": true,
	} with input as {
		"user": {
            "id": "auth0|61c3f50c951c5000704dc981",
			"roles": ["99c60055-7538-426c-8592-34bfe68f7e0d"]
        },
		"method": "GET",
		"path": ["shares"],
		"permission": 32,
        "context": {
            "resourceId": "_932350bb-5a00-415c-a4de-90629389a0e1",
            "resourceType": "Process"
        }
	} with data.roles as roles.roles with data.processes as processes.processes with data.shares as shares.shares
}

test_get_shares_resource_owner_not_granted {
	print("Test: Ensure that users can't view PROCEED shares from resource, because user owns the resource but has missing permissions from roles.")
	main.decision == {
		"allow": false,
	} with input as {
		"user": {
            "id": "auth0|61c3f50c951c5000704dc981",
			"roles": ["c6e6193e-8a25-40fe-a594-0fdd4882339a"]
        },
		"method": "GET",
		"path": ["shares"],
		"permission": 32,
        "context": {
            "resourceId": "_932350bb-5a00-415c-a4de-90629389a0e1",
            "resourceType": "Process"
        }
	} with data.roles as roles.roles with data.processes as processes.processes with data.shares as shares.shares
}

test_get_shares_granted_because_resource_shared {
	print("Test: Ensure that users can view PROCEED shares from resource, because someone shared resource with user resource.")
	main.decision == {
		"allow": true,
	} with input as {
		"user": {
            "id": "auth0|6174afb925f203006808dbd5",
        },
		"method": "GET",
		"path": ["shares"],
		"permission": 32,
        "context": {
            "resourceId": "_932350bb-5a00-415c-a4de-90629389a0e1",
            "resourceType": "Process"
        }
	} with data.roles as roles.roles with data.processes as processes.processes with data.shares as shares.shares
}

test_get_all_shares_resource_owner {
	print("Test: Ensure that response contains all shares because user is resource owner and has share permissions from roles.")
	{share | share := main.decision.filter[_].id} == {"27c89747-c5ca-4a52-9f29-5fbcfcd38562", "4cef9860-47ae-4cba-84d4-d8d05a9319a9", "22c519d3-71e4-4c41-8ce4-4d444fc5b8c8", "b8cad4a9-1892-4da5-8ada-6b6c75237e0f"} with input as {
		"user": {
            "id": "auth0|61c3f50c951c5000704dc981",
        },
		"method": "GET",
		"path": ["shares"],
		"permission": 32,
		"filter": true,
        "context": {
            "resourceId": "_932350bb-5a00-415c-a4de-90629389a0e1",
            "resourceType": "Process"
        }
	} with data.roles as roles.roles with data.processes as processes.processes with data.shares as shares.shares
}

test_get_all_user_shares {
	print("Test: Ensure that response only contains user sharings.")
	{share | share := main.decision.filter[_].id} == {"22c519d3-71e4-4c41-8ce4-4d444fc5b8c8", "4cef9860-47ae-4cba-84d4-d8d05a9319a9", "27c89747-c5ca-4a52-9f29-5fbcfcd38562"} with input as {
		"user": {
            "id": "auth0|6174afb925f203006808dbd5",
        },
		"method": "GET",
		"path": ["shares"],
		"permission": 32,
		"filter": true,
        "context": {
            "resourceId": "_932350bb-5a00-415c-a4de-90629389a0e1",
            "resourceType": "Process"
        }
	} with data.roles as roles.roles with data.processes as processes.processes with data.shares as shares.shares
}

test_get_shares_not_allowed {
	print("Test: Ensure that users can't view PROCEED shares from resource, because nobody shared resource with requester and requester is not resource owner.")
	main.decision == {
		"allow": false,
	} with input as {
		"user": {
            "id": "55d8e958-6eb8-44ec-967f-ee6345a3ad8e",
        },
		"method": "GET",
		"path": ["shares"],
		"permission": 32,
        "context": {
            "resourceId": "_932350bb-5a00-415c-a4de-90629389a0e1",
            "resourceType": "Process"
        }
	} with data.roles as roles.roles with data.processes as processes.processes with data.shares as shares.shares
}

test_get_shares_unauthenticated {
	print("Test: Ensure that unauthenticated users can't view PROCEED shares.")
	main.decision == {
		"allow": false,
	} with input as {
		"method": "GET",
		"path": ["shares"],
		"permission": 1,
		"context": {
            "resourceId": "_932350bb-5a00-415c-a4de-90629389a0e1",
            "resourceType": "Process"
        }
	} with data.roles as roles.roles with data.processes as processes.processes with data.shares as shares.shares
}

# POST /api/shares

test_post_shares_admin {
	print("Test: Ensure that users can create new PROCEED shares for resource, because user is admin.")
	main.decision == {
		"allow": true,
	} with input as {
		"user": users.admin,
		"method": "POST",
		"path": ["shares"],
		"permission": 32,
        "context": {
            "resourceId": "_932350bb-5a00-415c-a4de-90629389a0e1",
            "resourceType": "Process"
        }
	} with data.roles as roles.roles with data.processes as processes.processes with data.shares as shares.shares
}

test_post_shares_resource_owner_granted {
	print("Test: Ensure that users can create new PROCEED shares for resource, because user owns the resource and has permissions from role.")
	main.decision == {
		"allow": true,
	} with input as {
		"user": {
            "id": "auth0|61c3f50c951c5000704dc981",
			"roles": ["99c60055-7538-426c-8592-34bfe68f7e0d"]
        },
		"method": "POST",
		"path": ["shares"],
		"permission": 32,
        "context": {
            "resourceId": "_932350bb-5a00-415c-a4de-90629389a0e1",
            "resourceType": "Process"
        }
	} with data.roles as roles.roles with data.processes as processes.processes with data.shares as shares.shares
}

test_post_shares_resource_owner_not_granted {
	print("Test: Ensure that users can't create new PROCEED shares for resource, because user owns the resource but has missing permissions from role.")
	main.decision == {
		"allow": false,
	} with input as {
		"user": {
            "id": "auth0|61c3f50c951c5000704dc981",
			"roles": ["c6e6193e-8a25-40fe-a594-0fdd4882339a"]
        },
		"method": "POST",
		"path": ["shares"],
		"permission": 32,
        "context": {
            "resourceId": "_932350bb-5a00-415c-a4de-90629389a0e1",
            "resourceType": "Process"
        }
	} with data.roles as roles.roles with data.processes as processes.processes with data.shares as shares.shares
}

test_post_shares_granted_resource_is_shared {
	print("Test: Ensure that users can create new PROCEED shares for resource, because he or she has permissions to share the resource.")
	main.decision == {
		"allow": true,
	} with input as {
		"user": {
            "id": "auth0|6174afb925f203006808dbd5",
        },
		"method": "POST",
		"path": ["shares"],
		"permission": 32,
        "context": {
            "resourceId": "_932350bb-5a00-415c-a4de-90629389a0e1",
            "resourceType": "Process"
        }
	} with data.roles as roles.roles with data.processes as processes.processes with data.shares as shares.shares
}

test_post_shares_not_allowed {
	print("Test: Ensure that users can't create new PROCEED shares for resource, because requester is not resource owner and he or she has no permissions to share the resource.")
	main.decision == {
		"allow": false,
	} with input as {
		"user": {
            "id": "55d8e958-6eb8-44ec-967f-ee6345a3ad8e",
        },
		"method": "POST",
		"path": ["shares"],
		"permission": 32,
        "context": {
            "resourceId": "_932350bb-5a00-415c-a4de-90629389a0e1",
            "resourceType": "Process"
        }
	} with data.roles as roles.roles with data.processes as processes.processes with data.shares as shares.shares
}

test_post_shares_unauthenticated {
	print("Test: Ensure that unauthenticated users can't create new PROCEED shares for resource.")
	main.decision == {
		"allow": false,
	} with input as {
		"body": {
			"permissions": 1,
			"resourceType": "Process",
			"resourceId": "_932350bb-5a00-415c-a4de-90629389a0e1",
			"type": 0,
			"sharedWith": "d22e393d-373e-47d6-afd1-064c80d724c7"
		},
		"method": "POST",
		"path": ["shares"],
		"permission": 32,
		"context": {
            "resourceId": "_932350bb-5a00-415c-a4de-90629389a0e1",
            "resourceType": "Process"
        }
	} with data.roles as roles.roles with data.processes as processes.processes with data.shares as shares.shares
}

# PUT /api/shares/:id

test_put_shares_admin {
	print("Test: Ensure that users can update PROCEED shares for resource, because user is admin.")
	main.decision == {
		"allow": true,
	} with input as {
		"user": users.admin,
		"method": "PUT",
		"path": ["shares", "4cef9860-47ae-4cba-84d4-d8d05a9319a9"],
		"permission": 32,
        "context": {
            "resourceId": "_932350bb-5a00-415c-a4de-90629389a0e1",
            "resourceType": "Process"
        }
	} with data.roles as roles.roles with data.processes as processes.processes with data.shares as shares.shares
}

test_put_shares_resource_owner_granted {
	print("Test: Ensure that users can update PROCEED shares for resource, because user is resource owner and has permissions from roles.")
	main.decision == {
		"allow": true,
	} with input as {
		"user": {
            "id": "auth0|61c3f50c951c5000704dc981",
			"roles": ["99c60055-7538-426c-8592-34bfe68f7e0d"]
        },
		"method": "PUT",
		"path": ["shares", "4cef9860-47ae-4cba-84d4-d8d05a9319a9"],
		"permission": 32,
        "context": {
            "resourceId": "_932350bb-5a00-415c-a4de-90629389a0e1",
            "resourceType": "Process"
        }
	} with data.roles as roles.roles with data.processes as processes.processes with data.shares as shares.shares
}

test_put_shares_resource_owner_not_granted {
	print("Test: Ensure that users can't update PROCEED shares for resource, because user is resource owner but has missing permissions from roles.")
	main.decision == {
		"allow": false,
	} with input as {
		"user": {
            "id": "auth0|61c3f50c951c5000704dc981",
			"roles": ["c6e6193e-8a25-40fe-a594-0fdd4882339a"]
        },
		"method": "PUT",
		"path": ["shares", "4cef9860-47ae-4cba-84d4-d8d05a9319a9"],
		"permission": 32,
        "context": {
            "resourceId": "_932350bb-5a00-415c-a4de-90629389a0e1",
            "resourceType": "Process"
        }
	} with data.roles as roles.roles with data.processes as processes.processes with data.shares as shares.shares
}

test_put_shares_granted_resource_is_shared {
	print("Test: Ensure that users can update PROCEED shares for resource, because he or she has permissions to share the resource.")
	main.decision == {
		"allow": true,
	} with input as {
		"user": {
            "id": "auth0|61d5dd78d27de7006abc1950",
        },
		"method": "PUT",
		"path": ["shares", "22c519d3-71e4-4c41-8ce4-4d444fc5b8c8"],
		"permission": 32,
        "context": {
            "resourceId": "_932350bb-5a00-415c-a4de-90629389a0e1",
            "resourceType": "Process"
        }
	} with data.roles as roles.roles with data.processes as processes.processes with data.shares as shares.shares
}

test_put_shares_not_allowed {
	print("Test: Ensure that users can't update PROCEED shares for resource, because requester is not resource owner and he or she has no permissions to share the resource.")
	main.decision == {
		"allow": false,
	} with input as {
		"user": {
            "id": "55d8e958-6eb8-44ec-967f-ee6345a3ad8e",
        },
		"method": "PUT",
		"path": ["shares", "4cef9860-47ae-4cba-84d4-d8d05a9319a9"],
		"permission": 32,
        "context": {
            "resourceId": "_932350bb-5a00-415c-a4de-90629389a0e1",
            "resourceType": "Process"
        }
	} with data.roles as roles.roles with data.processes as processes.processes with data.shares as shares.shares
}

test_put_shares_unauthenticated {
	print("Test: Ensure that unauthenticated users can't update PROCEED shares for resource.")
	main.decision == {
		"allow": false,
	} with input as {
		"method": "PUT",
		"path": ["shares", "4cef9860-47ae-4cba-84d4-d8d05a9319a9"],
		"permission": 32,
		"context": {
            "resourceId": "_932350bb-5a00-415c-a4de-90629389a0e1",
            "resourceType": "Process"
        }
	} with data.roles as roles.roles with data.processes as processes.processes with data.shares as shares.shares
}

# DELETE /api/shares/:id

test_delete_shares_admin {
	print("Test: Ensure that users can delete PROCEED shares for resource, because user admin.")
	main.decision == {
		"allow": true,
	} with input as {
		"user": users.admin,
		"method": "DELETE",
		"path": ["shares", "4cef9860-47ae-4cba-84d4-d8d05a9319a9"],
		"permission": 32,
        "context": {
            "resourceId": "_932350bb-5a00-415c-a4de-90629389a0e1",
            "resourceType": "Process"
        }
	} with data.roles as roles.roles with data.processes as processes.processes with data.shares as shares.shares
}

test_delete_shares_resource_owner {
	print("Test: Ensure that users can delete PROCEED shares for resource, because user is resource owner and has share permissions in role.")
	main.decision == {
		"allow": true,
	} with input as {
		"user": {
            "id": "auth0|61c3f50c951c5000704dc981",
			"roles": ["99c60055-7538-426c-8592-34bfe68f7e0d"]
        },
		"method": "DELETE",
		"path": ["shares", "4cef9860-47ae-4cba-84d4-d8d05a9319a9"],
		"permission": 32,
        "context": {
            "resourceId": "_932350bb-5a00-415c-a4de-90629389a0e1",
            "resourceType": "Process"
        }
	} with data.roles as roles.roles with data.processes as processes.processes with data.shares as shares.shares
}

test_delete_shares_resource_owner_no_role_permissions {
	print("Test: Ensure that users can't delete PROCEED shares for resource, because user is resource owner but has missing share permissions in role.")
	main.decision == {
		"allow": false,
	} with input as {
		"user": {
            "id": "auth0|61c3f50c951c5000704dc981",
			"roles": ["d59266f8-0818-4923-8a31-abeff91c4963"]
        },
		"method": "DELETE",
		"path": ["shares", "4cef9860-47ae-4cba-84d4-d8d05a9319a9"],
		"permission": 32,
        "context": {
            "resourceId": "_932350bb-5a00-415c-a4de-90629389a0e1",
            "resourceType": "Process"
        }
	} with data.roles as roles.roles with data.processes as processes.processes with data.shares as shares.shares
}

test_delete_shares_share_owner_no_role_permissions {
	print("Test: Ensure that users can't delete PROCEED shares for resource, because user is resource owner but has missing share permissions in role.")
	main.decision == {
		"allow": false,
	} with input as {
		"user": {
            "id": "auth0|6174afb925f203006808abc4",
			"roles": ["d59266f8-0818-4923-8a31-abeff91c4963"]
        },
		"method": "DELETE",
		"path": ["shares", "27c89747-c5ca-4a52-9f29-5fbcfcd38562"],
		"permission": 32,
        "context": {
            "resourceId": "_932350bb-5a00-415c-a4de-90629389a0e1",
            "resourceType": "Process"
        }
	} with data.roles as roles.roles with data.processes as processes.processes with data.shares as shares.shares
}

test_delete_shares_share_owner_and_role_permissions {
	print("Test: Ensure that users can't delete PROCEED shares for resource, because user is resource owner but has missing share permissions in role.")
	main.decision == {
		"allow": true,
	} with input as {
		"user": {
            "id": "auth0|6174afb925f203006808abc4",
			"roles": ["99c60055-7538-426c-8592-34bfe68f7e0d"]
        },
		"method": "DELETE",
		"path": ["shares", "27c89747-c5ca-4a52-9f29-5fbcfcd38562"],
		"permission": 32,
        "context": {
            "resourceId": "_932350bb-5a00-415c-a4de-90629389a0e1",
            "resourceType": "Process"
        }
	} with data.roles as roles.roles with data.processes as processes.processes with data.shares as shares.shares
}

test_delete_shares_granted {
	print("Test: Ensure that users can delete PROCEED shares for resource, because requester has sufficient permissions.")
	main.decision == {
		"allow": true,
	} with input as {
		"user": {
            "id": "auth0|61d5dd78d27de7006abc1950",
        },
		"method": "DELETE",
		"path": ["shares", "22c519d3-71e4-4c41-8ce4-4d444fc5b8c8"],
		"permission": 32,
        "context": {
            "resourceId": "_932350bb-5a00-415c-a4de-90629389a0e1",
            "resourceType": "Process"
        }
	} with data.roles as roles.roles with data.processes as processes.processes with data.shares as shares.shares
}

test_delete_shares_not_allowed {
	print("Test: Ensure that users can't delete PROCEED shares for resource, because requester is not resource owner and he or she has no permissions to share the resource.")
	main.decision == {
		"allow": false,
	} with input as {
		"user": {
            "id": "55d8e958-6eb8-44ec-967f-ee6345a3ad8e",
        },
		"method": "DELETE",
		"path": ["shares", "4cef9860-47ae-4cba-84d4-d8d05a9319a9"],
		"permission": 32,
        "context": {
            "resourceId": "_932350bb-5a00-415c-a4de-90629389a0e1",
            "resourceType": "Process"
        }
	} with data.roles as roles.roles with data.processes as processes.processes with data.shares as shares.shares
}

test_delete_shares_unauthenticated {
	print("Test: Ensure that unauthenticated users can't delete PROCEED shares for resource.")
	main.decision == {
		"allow": false,
	} with input as {
		"method": "DELETE",
		"path": ["shares", "4cef9860-47ae-4cba-84d4-d8d05a9319a9"],
		"permission": 32,
		"context": {
            "resourceId": "_932350bb-5a00-415c-a4de-90629389a0e1",
            "resourceType": "Process"
        }
	} with data.roles as roles.roles with data.processes as processes.processes with data.shares as shares.shares
}