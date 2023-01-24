# opa test -v main.rego ./tests/machine_test.rego ./policies/common.rego ./policies/machine.rego ./mocks
# opa test -v --coverage --format=json main.rego ./tests/machine_test.rego ./policies/common.rego ./policies/machine.rego ./mocks

# METADATA
# title: Machine Policies Tests
# description: Tests for PROCEED MS /api/machines REST API
# scope: package
# authors:
# - name: Kevin Hertwig
#   email: hertwig@campus.tu-berlin.de
package machine_test

import data.main
import data.mocks.roles
import data.mocks.users

# GET /api/machines

test_get_machines_admin {
	print("Test: Ensure that users can view PROCEED machines, because user is super admin.")
	main.decision.allow == true with input as {
		"permission": 1,
        "resource": "Machine",
		"method": "GET",
		"path": ["machines"],
		"user": users.admin,
	} with data.roles as roles.roles
}

test_get_machines_has_admin_permissions {
	print("Test: Ensure that users can view PROCEED machines, because user has admin permissions for machines.")
	main.decision.allow == true with input as {
		"user": {
            "roles": ["8ae56c4f-fe37-4cf8-ae0f-42fab0fce1be"]
        },
        "resource": "Machine",
		"method": "GET",
		"path": ["machines"],
		"permission": 1,
	} with data.roles as roles.roles
}

test_get_machines_not_granted {
	print("Test: Ensure that users can't view PROCEED machines, because user has no sufficient permissions.")
	main.decision.allow == false with input as {
		"user": users.all_role_permissions,
        "resource": "Machine",
		"method": "GET",
		"path": ["machines"],
		"permission": 1,
	} with data.roles as roles.roles
}

test_get_machines_granted {
	print("Test: Ensure that users can view PROCEED machines, because user has sufficient permissions.")
	main.decision.allow == true with input as {
		"user": {
            "roles": ["99c60055-7538-426c-8592-34bfe68f7e0d"]
        },
        "resource": "Machine",
		"method": "GET",
		"path": ["machines"],
		"permission": 1,
	} with data.roles as roles.roles
}

test_get_machines_unauthenticated {
	print("Test: Ensure that unauthenticated users can't view PROCEED machines.")
	main.decision.allow == false with input as {
        "resource": "Machine",
		"method": "GET",
		"path": ["machines"],
		"permission": 1,
	} with data.roles as roles.roles
}

# GET /api/machines/:id

test_get_machines_by_id_admin {
	print("Test: Ensure that users can view PROCEED machines by id, because user is super admin.")
	main.decision.allow == true with input as {
		"permission": 1,
        "resource": "Machine",
		"method": "GET",
		"path": ["machines", "_932350bb-5a00-415c-a4de-90629389a0e1"],
		"user": users.admin,
	} with data.roles as roles.roles
}

test_get_machines_by_id_has_admin_permissions {
	print("Test: Ensure that users can view PROCEED machines by id, because user has admin permissions for machines.")
	main.decision.allow == true with input as {
		"user": {
            "roles": ["8ae56c4f-fe37-4cf8-ae0f-42fab0fce1be"]
        },
        "resource": "Machine",
		"method": "GET",
		"path": ["machines", "_932350bb-5a00-415c-a4de-90629389a0e1"],
		"permission": 1,
	} with data.roles as roles.roles
}

test_get_machines_by_id_not_granted {
	print("Test: Ensure that users can't view PROCEED machines by id, because user has no sufficient permissions.")
	main.decision.allow == false with input as {
		"user": users.all_role_permissions,
        "resource": "Machine",
		"method": "GET",
		"path": ["machines", "_932350bb-5a00-415c-a4de-90629389a0e1"],
		"permission": 1,
	} with data.roles as roles.roles
}

test_get_machines_by_id_granted {
	print("Test: Ensure that users can view PROCEED machines by id, because user has sufficient permissions.")
	main.decision.allow == true with input as {
		"user": {
            "roles": ["99c60055-7538-426c-8592-34bfe68f7e0d"]
        },
        "resource": "Machine",
		"method": "GET",
		"path": ["machines", "_932350bb-5a00-415c-a4de-90629389a0e1"],
		"permission": 1,
	} with data.roles as roles.roles
}

test_get_machines_by_id_unauthenticated {
	print("Test: Ensure that unauthenticated users can't view PROCEED machines by id.")
	main.decision.allow == false with input as {
        "resource": "Machine",
		"method": "GET",
		"path": ["machines", "_932350bb-5a00-415c-a4de-90629389a0e1"],
		"permission": 1,
	} with data.roles as roles.roles
}

# POST /api/machines

test_post_machines_admin {
	print("Test: Ensure that users can create new PROCEED machines, because user is super admin.")
	main.decision.allow == true with input as {
		"permission": [4, 16],
        "resource": "Machine",
		"method": "POST",
		"path": ["machines"],
		"user": users.admin,
	} with data.roles as roles.roles
}

test_post_machines_has_admin_permissions {
	print("Test: Ensure that users can create new PROCEED machines, because user has admin permissions for machines.")
	main.decision.allow == true with input as {
		"user": {
            "roles": ["8ae56c4f-fe37-4cf8-ae0f-42fab0fce1be"]
        },
        "resource": "Machine",
		"method": "POST",
		"path": ["machines"],
		"permission": [4, 16],
	} with data.roles as roles.roles
}

test_post_machines_not_granted {
	print("Test: Ensure that users can't create new PROCEED machines, because user has no sufficient permissions.")
	main.decision.allow == false with input as {
		"user": users.all_role_permissions,
        "resource": "Machine",
		"method": "POST",
		"path": ["machines"],
		"permission": [4, 16],
	} with data.roles as roles.roles
}

test_post_machines_granted {
	print("Test: Ensure that users can create new PROCEED machines, because user has sufficient permissions.")
	main.decision.allow == true with input as {
		"user": {
            "roles": ["99c60055-7538-426c-8592-34bfe68f7e0d"]
        },
        "resource": "Machine",
		"method": "POST",
		"path": ["machines"],
		"permission": [4, 16],
	} with data.roles as roles.roles
}

test_post_machines_unauthenticated {
	print("Test: Ensure that unauthenticated users can't create new PROCEED machines.")
	main.decision.allow == false with input as {
        "resource": "Machine",
		"method": "POST",
		"path": ["machines"],
		"permission": [4, 16],
	} with data.roles as roles.roles
}

# PUT /api/machines/:id

test_put_machines_admin {
	print("Test: Ensure that users can update PROCEED machines, because user is super admin.")
	main.decision.allow == true with input as {
		"permission": [2, 16],
        "resource": "Machine",
		"method": "PUT",
		"path": ["machines", "_932350bb-5a00-415c-a4de-90629389a0e1"],
		"user": users.admin,
	} with data.roles as roles.roles
}

test_put_machines_has_admin_permissions {
	print("Test: Ensure that users can update PROCEED machines, because user has admin permissions for machines.")
	main.decision.allow == true with input as {
		"user": {
            "roles": ["8ae56c4f-fe37-4cf8-ae0f-42fab0fce1be"]
        },
        "resource": "Machine",
		"method": "PUT",
		"path": ["machines", "_932350bb-5a00-415c-a4de-90629389a0e1"],
		"permission": [2, 16],
	} with data.roles as roles.roles
}

test_put_machines_not_granted {
	print("Test: Ensure that users can't update PROCEED machines, because user has no sufficient permissions.")
	main.decision.allow == false with input as {
		"user": users.all_role_permissions,
        "resource": "Machine",
		"method": "PUT",
		"path": ["machines", "_932350bb-5a00-415c-a4de-90629389a0e1"],
		"permission": [2, 16],
	} with data.roles as roles.roles
}

test_put_machines_granted {
	print("Test: Ensure that users can update PROCEED machines, because user has sufficient permissions.")
	main.decision.allow == true with input as {
		"user": {
            "roles": ["99c60055-7538-426c-8592-34bfe68f7e0d"]
        },
        "resource": "Machine",
		"method": "PUT",
		"path": ["machines", "_932350bb-5a00-415c-a4de-90629389a0e1"],
		"permission": [2, 16],
	} with data.roles as roles.roles
}

test_put_machines_unauthenticated {
	print("Test: Ensure that unauthenticated users can't update PROCEED machines.")
	main.decision.allow == false with input as {
        "resource": "Machine",
		"method": "PUT",
		"path": ["machines", "_932350bb-5a00-415c-a4de-90629389a0e1"],
		"permission": [2, 16],
	} with data.roles as roles.roles
}

# DELETE /api/machines/:id

test_delete_machines_admin {
	print("Test: Ensure that users can delete PROCEED machines, because user is super admin.")
	main.decision.allow == true with input as {
		"permission": [8, 16],
        "resource": "Machine",
		"method": "DELETE",
		"path": ["machines", "_932350bb-5a00-415c-a4de-90629389a0e1"],
		"user": users.admin,
	} with data.roles as roles.roles
}

test_delete_machines_has_admin_permissions {
	print("Test: Ensure that users can delete PROCEED machines, because user has admin permissions for machines.")
	main.decision.allow == true with input as {
		"user": {
            "roles": ["8ae56c4f-fe37-4cf8-ae0f-42fab0fce1be"]
        },
        "resource": "Machine",
		"method": "DELETE",
		"path": ["machines", "_932350bb-5a00-415c-a4de-90629389a0e1"],
		"permission": [8, 16],
	} with data.roles as roles.roles
}

test_delete_machines_not_granted {
	print("Test: Ensure that users can't delete PROCEED machines, because user has no sufficient permissions.")
	main.decision.allow == false with input as {
		"user": users.all_role_permissions,
        "resource": "Machine",
		"method": "DELETE",
		"path": ["machines", "_932350bb-5a00-415c-a4de-90629389a0e1"],
		"permission": [8, 16],
	} with data.roles as roles.roles
}

test_delete_machines_granted {
	print("Test: Ensure that users can delete PROCEED machines, because user has sufficient permissions.")
	main.decision.allow == true with input as {
		"user": {
            "roles": ["99c60055-7538-426c-8592-34bfe68f7e0d"]
        },
        "resource": "Machine",
		"method": "DELETE",
		"path": ["machines", "_932350bb-5a00-415c-a4de-90629389a0e1"],
		"permission": [8, 16],
	} with data.roles as roles.roles
}

test_delete_machines_unauthenticated {
	print("Test: Ensure that unauthenticated users can't delete PROCEED machines.")
	main.decision.allow == false with input as {
        "resource": "Machine",
		"method": "DELETE",
		"path": ["machines", "_932350bb-5a00-415c-a4de-90629389a0e1"],
		"permission": [8, 16],
	} with data.roles as roles.roles
}