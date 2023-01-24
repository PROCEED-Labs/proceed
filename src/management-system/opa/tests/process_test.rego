# opa test -v main.rego ./tests/process_test.rego ./policies/common.rego ./policies/process.rego ./mocks
# opa test -v --coverage --format=json main.rego ./tests/process_test.rego ./policies/common.rego ./policies/process.rego ./mocks

# METADATA
# title: Process/Project/Template Policies Tests
# description: Tests for PROCEED MS /api/process REST API
# scope: package
# authors:
# - name: Kevin Hertwig
#   email: hertwig@campus.tu-berlin.de
package process_test

import data.main
import data.mocks.roles
import data.mocks.users
import data.mocks.shares
import data.mocks.processes

# GET /api/process

test_get_process_admin {
	print("Test: Ensure that users can view PROCEED processes, because user is super admin.")
	{process | process := main.decision.filter[_].id} == {"_932350bb-5a00-415c-a4de-90629389a0e1", "_dcc316cc-67a1-4b7a-929b-831e73b06f2a", "_a19c9329-7b52-4516-939a-0fdc0151ace4"} with input as {
		"permission": 1,
        "resource": "Process",
		"method": "GET",
		"path": ["process"],
        "filter": true,
		"user": users.admin,
	} with data.roles as roles.roles with data.processes as processes.processes with data.shares as shares.shares
}

test_get_process_admin_permissions {
	print("Test: Ensure that users can view PROCEED processes, because user has admin permissions super admin.")
	{process | process := main.decision.filter[_].permissions} == {9007199254740991} with input as {
		"permission": 1,
        "resource": "Process",
		"method": "GET",
		"path": ["process"],
        "filter": true,
		"user": users.admin,
	} with data.roles as roles.roles with data.processes as processes.processes with data.shares as shares.shares
}

test_get_process_has_admin_permissions {
	print("Test: Ensure that users can view PROCEED processes, because user has admin permissions for processes.")
	{process | process := main.decision.filter[_].id} == {"_932350bb-5a00-415c-a4de-90629389a0e1", "_dcc316cc-67a1-4b7a-929b-831e73b06f2a", "_a19c9329-7b52-4516-939a-0fdc0151ace4"} with input as {
		"user": users.process_engineer_admin,
        "filter": true,
        "resource": "Process",
		"method": "GET",
		"path": ["process"],
		"permission": 1,
	} with data.roles as roles.roles with data.processes as processes.processes with data.shares as shares.shares
}

test_get_process_has_admin_permissions_permissions {
	print("Test: Ensure that users can view PROCEED processes, because user has admin permissions for processes.")
	{process | process := main.decision.filter[_].permissions} == {9007199254740991} with input as {
		"user": users.process_engineer_admin,
        "filter": true,
        "resource": "Process",
		"method": "GET",
		"path": ["process"],
		"permission": 1,
	} with data.roles as roles.roles with data.processes as processes.processes with data.shares as shares.shares
}

test_get_process_not_granted {
	print("Test: Ensure that users can't view PROCEED processes, because user has no sufficient permissions.")
	main.decision.allow == false with input as {
		"user": users.all_role_permissions,
        "filter": true,
        "resource": "Process",
		"method": "GET",
		"path": ["process"],
		"permission": 1,
	} with data.roles as roles.roles with data.processes as processes.processes with data.shares as shares.shares
}

test_get_process_shared {
	print("Test: Ensure that users can view PROCEED processes, because has shared processes.")
	{process | process := main.decision.filter[_].id} == {"_932350bb-5a00-415c-a4de-90629389a0e1"} with input as {
		"user": {
            "id": "auth0|6174afb925f203006808dbd5",
            "roles": ["99c60055-7538-426c-8592-34bfe68f7e0d"]
        },
        "filter": true,
        "resource": "Process",
		"method": "GET",
		"path": ["process"],
		"permission": 1,
	} with data.roles as roles.roles with data.processes as processes.processes with data.shares as shares.shares
}

test_get_process_shared_permissions {
	print("Test: Ensure that users can view PROCEED processes, because has shared processes.")
	{process | process := main.decision.filter[_].permissions} == {43} with input as {
		"user": {
            "id": "auth0|6174afb925f203006808dbd5",
            "roles": ["99c60055-7538-426c-8592-34bfe68f7e0d"]
        },
        "filter": true,
        "resource": "Process",
		"method": "GET",
		"path": ["process"],
		"permission": 1,
	} with data.roles as roles.roles with data.processes as processes.processes with data.shares as shares.shares
}

test_get_process_shared_not_granted {
	print("Test: Ensure that users can't view PROCEED processes, because has shared processes but insufficient role permissions.")
	main.decision.allow == false with input as {
		"user": {
            "id": "auth0|6174afb925f203006808dbd5",
            "roles": ["1943cce1-a88f-4c58-aae6-f74b25730a2c"]
        },
        "filter": true,
        "resource": "Process",
		"method": "GET",
		"path": ["process"],
		"permission": 1,
	} with data.roles as roles.roles with data.processes as processes.processes with data.shares as shares.shares
}

test_get_process_owner_granted {
	print("Test: Ensure that users can view PROCEED processes, because is owner of process and has sufficient permissions.")
	{process | process := main.decision.filter[_].id} == {"_dcc316cc-67a1-4b7a-929b-831e73b06f2a"} with input as {
		"user": {
            "id": "2862dda7-7e40-4a70-a3fe-917fd9a2ac97",
            "roles": ["99c60055-7538-426c-8592-34bfe68f7e0d"]
        },
        "filter": true,
        "resource": "Process",
		"method": "GET",
		"path": ["process"],
		"permission": 1,
	} with data.roles as roles.roles with data.processes as processes.processes with data.shares as shares.shares
}

test_get_process_owner_granted_permissions {
	print("Test: Ensure that users can view PROCEED processes, because is owner of process and has sufficient permissions.")
	{process | process := main.decision.filter[_].permissions} == {49} with input as {
		"user": {
            "id": "2862dda7-7e40-4a70-a3fe-917fd9a2ac97",
            "roles": ["99c60055-7538-426c-8592-34bfe68f7e0d"]
        },
        "filter": true,
        "resource": "Process",
		"method": "GET",
		"path": ["process"],
		"permission": 1,
	} with data.roles as roles.roles with data.processes as processes.processes with data.shares as shares.shares
}

test_get_process_owner_not_granted {
	print("Test: Ensure that users can't view PROCEED processes, because is owner of process but has insufficient permissions.")
	main.decision.allow == false with input as {
		"user": {
            "id": "2862dda7-7e40-4a70-a3fe-917fd9a2ac97",
            "roles": ["1943cce1-a88f-4c58-aae6-f74b25730a2c"]
        },
        "filter": true,
        "resource": "Process",
		"method": "GET",
		"path": ["process"],
		"permission": 1,
	} with data.roles as roles.roles with data.processes as processes.processes with data.shares as shares.shares
}

test_get_process_owner_unauthenticated {
	print("Test: Ensure that unauthenticated users can't view PROCEED processes.")
	main.decision.allow == false with input as {
        "filter": true,
        "resource": "Process",
		"method": "GET",
		"path": ["process"],
		"permission": 1,
	} with data.roles as roles.roles with data.processes as processes.processes with data.shares as shares.shares
}

# GET /api/process/:id

test_get_process_by_id_admin {
	print("Test: Ensure that users can view PROCEED process by id, because user is super admin.")
	main.decision.allow == true with input as {
		"permission": 1,
        "resource": "Process",
		"method": "GET",
		"path": ["process", "_dcc316cc-67a1-4b7a-929b-831e73b06f2a"],
		"user": users.admin,
	} with data.roles as roles.roles with data.processes as processes.processes with data.shares as shares.shares
}

test_get_process_by_id_has_admin_permissions {
	print("Test: Ensure that users can view PROCEED process by id, because user has admin permissions.")
	main.decision.allow == true with input as {
		"user": users.process_engineer_admin,
        "resource": "Process",
		"method": "GET",
		"path": ["process", "_dcc316cc-67a1-4b7a-929b-831e73b06f2a"],
		"permission": 1,
	} with data.roles as roles.roles with data.processes as processes.processes with data.shares as shares.shares
}

test_get_process_by_id_not_granted {
	print("Test: Ensure that users can't view PROCEED process by id, because insufficient role permissions.")
	main.decision.allow == false with input as {
		"user": users.all_role_permissions,
        "resource": "Process",
		"method": "GET",
		"path": ["process", "_dcc316cc-67a1-4b7a-929b-831e73b06f2a"],
		"permission": 1,
	} with data.roles as roles.roles with data.processes as processes.processes with data.shares as shares.shares
}

test_get_process_by_id_shared {
	print("Test: Ensure that users can view PROCEED process by id, because has shared processes.")
	main.decision.allow == true with input as {
		"user": {
            "id": "auth0|6174afb925f203006808dbd5",
            "roles": ["99c60055-7538-426c-8592-34bfe68f7e0d"]
        },
        "resource": "Process",
		"method": "GET",
		"path": ["process", "_932350bb-5a00-415c-a4de-90629389a0e1"],
		"permission": 1,
	} with data.roles as roles.roles with data.processes as processes.processes with data.shares as shares.shares
}

test_get_process_by_id_shared_not_granted {
	print("Test: Ensure that users can't view PROCEED process by id, because has shared processes but insufficient role permissions.")
	main.decision.allow == false with input as {
		"user": {
            "id": "auth0|6174afb925f203006808dbd5",
            "roles": ["1943cce1-a88f-4c58-aae6-f74b25730a2c"]
        },
        "resource": "Process",
		"method": "GET",
		"path": ["process", "_932350bb-5a00-415c-a4de-90629389a0e1"],
		"permission": 1,
	} with data.roles as roles.roles with data.processes as processes.processes with data.shares as shares.shares
}

test_get_process_by_id_owner_granted {
	print("Test: Ensure that users can view PROCEED process by id, because is owner of process and has sufficient permissions.")
	main.decision.allow == true with input as {
		"user": {
            "id": "auth0|61c3f50c951c5000704dc981",
            "roles": ["99c60055-7538-426c-8592-34bfe68f7e0d"]
        },
        "resource": "Process",
		"method": "GET",
		"path": ["process", "_932350bb-5a00-415c-a4de-90629389a0e1"],
		"permission": 1,
	} with data.roles as roles.roles with data.processes as processes.processes with data.shares as shares.shares
}

test_get_process_by_id_owner_not_granted {
	print("Test: Ensure that users can't view PROCEED process by id, because is owner of process but has insufficient permissions.")
	main.decision.allow == false with input as {
		"user": {
            "id": "auth0|61c3f50c951c5000704dc981",
            "roles": ["1943cce1-a88f-4c58-aae6-f74b25730a2c"]
        },
        "resource": "Process",
		"method": "GET",
		"path": ["process", "_932350bb-5a00-415c-a4de-90629389a0e1"],
		"permission": 1,
	} with data.roles as roles.roles with data.processes as processes.processes with data.shares as shares.shares
}

test_get_process_by_id_unauthenticated {
	print("Test: Ensure that unauthenticated users can't view PROCEED process by id.")
	main.decision.allow == false with input as {
        "resource": "Process",
		"method": "GET",
		"path": ["process", "_932350bb-5a00-415c-a4de-90629389a0e1"],
		"permission": 1,
	} with data.roles as roles.roles with data.processes as processes.processes with data.shares as shares.shares
}

# POST /api/process

test_post_process_granted {
	print("Test: Ensure that users can create new PROCEED processes, because of sufficient role permissions.")
	main.decision.allow == true with input as {
		"user": {
            "id": "auth0|6174afb925f203006808dbd5",
            "roles": ["99c60055-7538-426c-8592-34bfe68f7e0d"]
        },
        "resource": "Process",
		"method": "POST",
		"path": ["process"],
		"permission": [4, 16],
	} with data.roles as roles.roles with data.processes as processes.processes with data.shares as shares.shares
}

test_post_process_granted {
	print("Test: Ensure that users can't create new PROCEED processes, because of insufficient role permissions.")
	main.decision.allow == false with input as {
		"user": {
            "id": "auth0|6174afb925f203006808dbd5",
            "roles": ["d59266f8-0818-4923-8a31-abeff91c4963"]
        },
        "resource": "Process",
		"method": "POST",
		"path": ["process"],
		"permission": [4, 16],
	} with data.roles as roles.roles with data.processes as processes.processes with data.shares as shares.shares
}

test_post_process_admin {
	print("Test: Ensure that users can create new PROCEED processes, because user is super admin.")
	main.decision.allow == true with input as {
		"user": users.admin,
        "resource": "Process",
		"method": "POST",
		"path": ["process"],
		"permission": [4, 16],
	} with data.roles as roles.roles with data.processes as processes.processes with data.shares as shares.shares
}

test_post_process_has_admin_permissions {
	print("Test: Ensure that users can create new PROCEED processes, because user has admin permissions.")
	main.decision.allow == true with input as {
		"user": users.process_engineer_admin,
        "resource": "Process",
		"method": "POST",
		"path": ["process"],
		"permission": [4, 16],
	} with data.roles as roles.roles with data.processes as processes.processes with data.shares as shares.shares
}

test_post_process_unauthenticated {
	print("Test: Ensure that unauthenticated users can't create new PROCEED processes.")
	main.decision.allow == false with input as {
        "resource": "Process",
		"method": "POST",
		"path": ["process"],
		"permission": [4, 16],
	} with data.roles as roles.roles with data.processes as processes.processes with data.shares as shares.shares
}

# PUT /api/process/:id

test_put_process_by_id_admin {
	print("Test: Ensure that users can update PROCEED process by id, because user is super admin.")
	main.decision.allow == true with input as {
		"permission": [2, 16],
        "resource": "Process",
		"method": "PUT",
		"path": ["process", "_dcc316cc-67a1-4b7a-929b-831e73b06f2a"],
		"user": users.admin,
	} with data.roles as roles.roles with data.processes as processes.processes with data.shares as shares.shares
}

test_put_process_by_id_has_admin_permissions {
	print("Test: Ensure that users can update PROCEED process by id, because user has admin permissions.")
	main.decision.allow == true with input as {
		"user": users.process_engineer_admin,
        "resource": "Process",
		"method": "PUT",
		"path": ["process", "_dcc316cc-67a1-4b7a-929b-831e73b06f2a"],
		"permission": [2, 16],
	} with data.roles as roles.roles with data.processes as processes.processes with data.shares as shares.shares
}

test_put_process_by_id_not_granted {
	print("Test: Ensure that users can't update PROCEED process by id, because insufficient role permissions.")
	main.decision.allow == false with input as {
		"user": users.all_role_permissions,
        "resource": "Process",
		"method": "PUT",
		"path": ["process", "_dcc316cc-67a1-4b7a-929b-831e73b06f2a"],
		"permission": [2, 16],
	} with data.roles as roles.roles with data.processes as processes.processes with data.shares as shares.shares
}

test_put_process_by_id_shared {
	print("Test: Ensure that users can update PROCEED process by id, because has shared processes.")
	main.decision.allow == true with input as {
		"user": {
            "id": "auth0|6174afb925f203006808dbd5",
            "roles": ["99c60055-7538-426c-8592-34bfe68f7e0d"]
        },
        "resource": "Process",
		"method": "PUT",
		"path": ["process", "_932350bb-5a00-415c-a4de-90629389a0e1"],
		"permission": [2, 16],
	} with data.roles as roles.roles with data.processes as processes.processes with data.shares as shares.shares
}

test_put_process_by_id_shared_not_granted {
	print("Test: Ensure that users can't update PROCEED process by id, because has shared processes but insufficient role permissions.")
	main.decision.allow == false with input as {
		"user": {
            "id": "auth0|6174afb925f203006808dbd5",
            "roles": ["1943cce1-a88f-4c58-aae6-f74b25730a2c"]
        },
        "resource": "Process",
		"method": "PUT",
		"path": ["process", "_932350bb-5a00-415c-a4de-90629389a0e1"],
		"permission": [2, 16],
	} with data.roles as roles.roles with data.processes as processes.processes with data.shares as shares.shares
}

test_put_process_by_id_owner_granted {
	print("Test: Ensure that users can update PROCEED process by id, because is owner of process and has sufficient permissions.")
	main.decision.allow == true with input as {
		"user": {
            "id": "auth0|61c3f50c951c5000704dc981",
            "roles": ["99c60055-7538-426c-8592-34bfe68f7e0d"]
        },
        "resource": "Process",
		"method": "PUT",
		"path": ["process", "_932350bb-5a00-415c-a4de-90629389a0e1"],
		"permission": [2, 16],
	} with data.roles as roles.roles with data.processes as processes.processes with data.shares as shares.shares
}

test_put_process_by_id_owner_not_granted {
	print("Test: Ensure that users can't update PROCEED process by id, because is owner of process but has insufficient permissions.")
	main.decision.allow == false with input as {
		"user": {
            "id": "auth0|61c3f50c951c5000704dc981",
            "roles": ["1943cce1-a88f-4c58-aae6-f74b25730a2c"]
        },
        "resource": "Process",
		"method": "PUT",
		"path": ["process", "_932350bb-5a00-415c-a4de-90629389a0e1"],
		"permission": [2, 16],
	} with data.roles as roles.roles with data.processes as processes.processes with data.shares as shares.shares
}

test_put_process_by_id_unauthenticated {
	print("Test: Ensure that unauthenticated users can't update PROCEED process by id.")
	main.decision.allow == false with input as {
        "resource": "Process",
		"method": "PUT",
		"path": ["process", "_932350bb-5a00-415c-a4de-90629389a0e1"],
		"permission": [2, 16],
	} with data.roles as roles.roles with data.processes as processes.processes with data.shares as shares.shares
}

# DELETE /api/process/:id

test_delete_process_by_id_admin {
	print("Test: Ensure that users can delete PROCEED process by id, because user is super admin.")
	main.decision.allow == true with input as {
		"permission": [8, 16],
        "resource": "Process",
		"method": "DELETE",
		"path": ["process", "_dcc316cc-67a1-4b7a-929b-831e73b06f2a"],
		"user": users.admin,
	} with data.roles as roles.roles with data.processes as processes.processes with data.shares as shares.shares
}

test_delete_process_by_id_has_admin_permissions {
	print("Test: Ensure that users can delete PROCEED process by id, because user has admin permissions.")
	main.decision.allow == true with input as {
		"user": users.process_engineer_admin,
        "resource": "Process",
		"method": "DELETE",
		"path": ["process", "_dcc316cc-67a1-4b7a-929b-831e73b06f2a"],
		"permission": [8, 16],
	} with data.roles as roles.roles with data.processes as processes.processes with data.shares as shares.shares
}

test_delete_process_by_id_not_granted {
	print("Test: Ensure that users can't delete PROCEED process by id, because insufficient role permissions.")
	main.decision.allow == false with input as {
		"user": users.all_role_permissions,
        "resource": "Process",
		"method": "DELETE",
		"path": ["process", "_dcc316cc-67a1-4b7a-929b-831e73b06f2a"],
		"permission": [8, 16],
	} with data.roles as roles.roles with data.processes as processes.processes with data.shares as shares.shares
}

test_delete_process_by_id_shared {
	print("Test: Ensure that users can delete PROCEED process by id, because has shared processes.")
	main.decision.allow == true with input as {
		"user": {
            "id": "auth0|6174afb925f203006808dbd5",
            "roles": ["99c60055-7538-426c-8592-34bfe68f7e0d"]
        },
        "resource": "Process",
		"method": "DELETE",
		"path": ["process", "_932350bb-5a00-415c-a4de-90629389a0e1"],
		"permission": [8, 16],
	} with data.roles as roles.roles with data.processes as processes.processes with data.shares as shares.shares
}

test_delete_process_by_id_shared_not_granted {
	print("Test: Ensure that users can't delete PROCEED process by id, because has shared processes but insufficient role permissions.")
	main.decision.allow == false with input as {
		"user": {
            "id": "auth0|6174afb925f203006808dbd5",
            "roles": ["1943cce1-a88f-4c58-aae6-f74b25730a2c"]
        },
        "resource": "Process",
		"method": "DELETE",
		"path": ["process", "_932350bb-5a00-415c-a4de-90629389a0e1"],
		"permission": [8, 16],
	} with data.roles as roles.roles with data.processes as processes.processes with data.shares as shares.shares
}

test_delete_process_by_id_owner_granted {
	print("Test: Ensure that users can delete PROCEED process by id, because is owner of process and has sufficient permissions.")
	main.decision.allow == true with input as {
		"user": {
            "id": "auth0|61c3f50c951c5000704dc981",
            "roles": ["99c60055-7538-426c-8592-34bfe68f7e0d"]
        },
        "resource": "Process",
		"method": "DELETE",
		"path": ["process", "_932350bb-5a00-415c-a4de-90629389a0e1"],
		"permission": [8, 16],
	} with data.roles as roles.roles with data.processes as processes.processes with data.shares as shares.shares
}

test_delete_process_by_id_owner_not_granted {
	print("Test: Ensure that users can't delete PROCEED process by id, because is owner of process but has insufficient permissions.")
	main.decision.allow == false with input as {
		"user": {
            "id": "auth0|61c3f50c951c5000704dc981",
            "roles": ["1943cce1-a88f-4c58-aae6-f74b25730a2c"]
        },
        "resource": "Process",
		"method": "DELETE",
		"path": ["process", "_932350bb-5a00-415c-a4de-90629389a0e1"],
		"permission": [8, 16],
	} with data.roles as roles.roles with data.processes as processes.processes with data.shares as shares.shares
}

test_delete_process_by_id_unauthenticated {
	print("Test: Ensure that unauthenticated users can't delete PROCEED process by id.")
	main.decision.allow == false with input as {
        "resource": "Process",
		"method": "DELETE",
		"path": ["process", "_932350bb-5a00-415c-a4de-90629389a0e1"],
		"permission": [8, 16],
	} with data.roles as roles.roles with data.processes as processes.processes with data.shares as shares.shares
}