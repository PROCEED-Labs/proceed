# opa test -v main.rego ./tests/iam_test.rego ./policies/common.rego ./policies/iam.rego ./mocks
# opa test -v --coverage --format=json main.rego ./tests/iam_test.rego ./policies/common.rego ./policies/iam.rego ./mocks

# METADATA
# title: IAM Policies Tests
# description: Tests for PROCEED MS /api/roles, /api/users, /api/role-mappings REST API
# scope: package
# authors:
# - name: Kevin Hertwig
#   email: hertwig@campus.tu-berlin.de
package iam_test

import data.main
import data.mocks.roles
import data.mocks.users

# GET /api/users

test_get_users_authenticated {
	print("Test: Ensure that authenticated users can view PROCEED users.")
	main.decision == {
		"allow": true,
	} with input as {
		"user": {},
		"method": "GET",
		"path": ["users"],
		"permission": 1,
		"resource": "User"
	}
}

test_get_users_unauthenticated {
	print("Test: Ensure that unauthenticated users can't view PROCEED users.")
	main.decision == {
		"allow": false,
	} with input as {
		"method": "GET",
		"path": ["users"],
		"permission": 1,
		"resource": "User"
	}
}

# GET /api/users/:id

test_get_user_authenticated {
	print("Test: Ensure that authenticated users can view PROCEED user by id.")
	main.decision == {
		"allow": true,
	} with input as {
		"user": {},
		"method": "GET",
		"path": ["users", "f0185d7d-b410-4bb5-bf8a-19bdfd0facfe"],
		"permission": 1,
		"resource": "User"
	}
}

test_get_user_unauthenticated {
	print("Test: Ensure that unauthenticated users can't view PROCEED user by id.")
	main.decision == {
		"allow": false,
	} with input as {
		"method": "GET",
		"path": ["users", "f0185d7d-b410-4bb5-bf8a-19bdfd0facfe"],
		"permission": 1,
		"resource": "User"
	}
}

# POST /api/users

test_post_user_granted_by_role {
	print("Test: Ensure that creating new users is granted by a role.")
	main.decision == {
		"allow": true,
	} with input as {
		"user": users.all_user_permissions,
		"method": "POST",
		"path": ["users"],
		"permission": [4, 16],
		"resource": "User"
	} with data.roles as roles.roles
}

test_post_user_granted_admin {
	print("Test: Ensure that creating new users is allowed because user is admin.")
	main.decision == {
		"allow": true,
	} with input as {
		"user": users.admin,
		"method": "POST",
		"path": ["users"],
		"permission": [4, 16],
		"resource": "User"
	} with data.roles as roles.roles
}

test_post_user_not_allowed {
	print("Test: Ensure that creating new users is not granted by a role and user is not admin.")
	main.decision == {
		"allow": false,
	} with input as {
		"user": users.all_role_permissions,
		"method": "POST",
		"path": ["users"],
		"permission": [4, 16],
		"resource": "User"
	} with data.roles as roles.roles
}

test_post_user_unauthenticated {
	print("Test: Ensure that creating new users is not allowed because user is unauthenticated.")
	main.decision == {
		"allow": false,
	} with input as {
		"method": "POST",
		"path": ["users"],
		"permission": [4, 16],
		"resource": "User"
	} with data.roles as roles.roles
}

# PUT /api/users/:id

test_put_user_password_self_granted {
	print("Test: Ensure that updating user password is allowed because requester updates his or her password.")
	main.decision == {
		"allow": true,
	} with input as {
		"user": users.self,
		"method": "PUT",
		"path": ["users", users.self.id, "update-password"],
		"permission": [2, 16],
		"resource": "User"
	} with data.roles as roles.roles
}

test_put_user_granted_admin {
	print("Test: Ensure that updating user is allowed because user is admin.")
	main.decision == {
		"allow": true,
	} with input as {
		"user": users.admin,
		"method": "PUT",
		"path": ["users", "246990cf-8b8c-40c0-b89b-fe8c4e11090a"],
		"permission": [2, 16],
		"resource": "User"
	} with data.roles as roles.roles
}

test_put_user_self_granted {
	print("Test: Ensure that updating user is allowed because requester updates his own resource.")
	main.decision == {
		"allow": true,
	} with input as {
		"user": users.self,
		"method": "PUT",
		"path": ["users", "246990cf-8b8c-40c0-b89b-fe8c4e11090a"],
		"permission": [2, 16],
		"resource": "User"
	} with data.roles as roles.roles
}

test_put_user_not_allowed {
	print("Test: Ensure that updating user is not allowed because requester updates someone else's resource and requester is not admin.")
	main.decision == {
		"allow": false,
	} with input as {
		"user": users.all_role_permissions,
		"method": "PUT",
		"path": ["users", "246990cf-8b8c-40c0-b89b-fe8c4e11090a"],
		"permission": [2, 16],
		"resource": "User"
	} with data.roles as roles.roles
}

test_put_user_unauthenticated {
	print("Test: Ensure that updating user is not allowed because requester is unauthenticated.")
	main.decision == {
		"allow": false,
	} with input as {
		"method": "PUT",
		"path": ["users", "246990cf-8b8c-40c0-b89b-fe8c4e11090a"],
		"permission": [2, 16],
		"resource": "User"
	} with data.roles as roles.roles
}

# DELETE /api/users/:id

test_delete_user_granted_admin {
	print("Test: Ensure that deleting a user is allowed because requester is admin.")
	main.decision == {
		"allow": true,
	} with input as {
		"user": users.admin,
		"method": "DELETE",
		"path": ["users", "246990cf-8b8c-40c0-b89b-fe8c4e11090a"],
		"permission": [8, 16],
		"resource": "User"
	} with data.roles as roles.roles
}

test_delete_user_self_granted {
	print("Test: Ensure that deleting a user is allowed because requester deletes his own user.")
	main.decision == {
		"allow": true,
	} with input as {
		"user": users.self,
		"method": "DELETE",
		"path": ["users", "246990cf-8b8c-40c0-b89b-fe8c4e11090a"],
		"permission": [8, 16],
		"resource": "User"
	} with data.roles as roles.roles
}

test_delete_user_not_allowed {
	print("Test: Ensure that deleting a user is not allowed because requester deletes not his own user and requester is not admin.")
	main.decision == {
		"allow": false,
	} with input as {
		"user": users.all_role_permissions,
		"method": "DELETE",
		"path": ["users", "246990cf-8b8c-40c0-b89b-fe8c4e11090a"],
		"permission": [8, 16],
		"resource": "User"
	} with data.roles as roles.roles
}

test_delete_user_unauthenticated {
	print("Test: Ensure that deleting a user is not allowed because requester is unauthenticated.")
	main.decision == {
		"allow": false,
	} with input as {
		"method": "DELETE",
		"path": ["users", "246990cf-8b8c-40c0-b89b-fe8c4e11090a"],
		"permission": [8, 16],
		"resource": "User"
	} with data.roles as roles.roles
}

# GET /api/roles

test_get_roles_authenticated {
	print("Test: Ensure that authenticated users can view PROCEED roles.")
	main.decision == {
		"allow": true,
	} with input as {
		"user": {},
		"method": "GET",
		"path": ["roles"],
		"permission": 1,
		"resource": "Role"
	}
}

test_get_roles_unauthenticated {
	print("Test: Ensure that unauthenticated users can't view PROCEED roles.")
	main.decision == {
		"allow": false,
	} with input as {
		"method": "GET",
		"path": ["roles"],
		"permission": 1,
		"resource": "Role"
	}
}

# GET /api/roles/:id

test_get_role_authenticated {
	print("Test: Ensure that authenticated users can view PROCEED role by id.")
	main.decision == {
		"allow": true,
	} with input as {
		"user": {},
		"method": "GET",
		"path": ["roles", "f0185d7d-b410-4bb5-bf8a-19bdfd0facfe"],
		"permission": 1,
		"resource": "Role"
	}
}

test_get_role_unauthenticated {
	print("Test: Ensure that unauthenticated users can't view PROCEED role by id.")
	main.decision == {
		"allow": false,
	} with input as {
		"method": "GET",
		"path": ["roles", "f0185d7d-b410-4bb5-bf8a-19bdfd0facfe"],
		"permission": 1,
		"resource": "Role"
	}
}

# POST /api/roles

test_post_role_granted_by_role {
	print("Test: Ensure that creating new roles is granted by a role.")
	main.decision == {
		"allow": true,
	} with input as {
		"user": users.all_role_permissions,
		"method": "POST",
		"path": ["roles"],
		"permission": [4, 16],
		"resource": "Role"
	} with data.roles as roles.roles
}

test_post_role_granted_admin {
	print("Test: Ensure that creating new roles is allowed because user is admin.")
	main.decision == {
		"allow": true,
	} with input as {
		"user": users.admin,
		"method": "POST",
		"path": ["roles"],
		"permission": [4, 16],
		"resource": "Role"
	} with data.roles as roles.roles
}

test_post_role_not_granted_by_role {
	print("Test: Ensure that creating new roles is not granted by a role and user is not admin.")
	main.decision == {
		"allow": false,
	} with input as {
		"user": users.all_user_permissions,
		"method": "POST",
		"path": ["roles"],
		"permission": [4, 16],
		"resource": "Role"
	} with data.roles as roles.roles
}

test_post_role_unauthenticated {
	print("Test: Ensure that creating new roles is not allowed because user is unauthenticated.")
	main.decision == {
		"allow": false,
	} with input as {
		"method": "POST",
		"path": ["roles"],
		"permission": [4, 16],
		"resource": "Role"
	} with data.roles as roles.roles
}

# PUT /api/roles/:id

test_put_role_granted_because_admin_allowed {
	print("Test: Ensure that updating role is allowed because user is admin.")
	main.decision == {
		"allow": true,
	} with input as {
		"user": users.admin,
		"body": {
			"name": "user_manager",
			"default": false,
			"permissions": {
				"Process": 8,
				"Project": 0,
			}
		},
		"method": "PUT",
		"path": ["roles", "1943cce1-a88f-4c58-aae6-f74b25730a2c"],
		"permission": [2, 16],
		"resource": "Role"
	} with data.roles as roles.roles
}

test_put_role_granted_by_role {
	print("Test: Ensure that updating role is allowed because it is granted by a role.")
	main.decision == {
		"allow": true,
	} with input as {
		"user": users.all_role_permissions,
		"body": {
			"name": "user_manager",
			"default": false,
			"permissions": {
				"Process": 8,
				"Project": 0,
			}
		},
		"method": "PUT",
		"path": ["roles", "1943cce1-a88f-4c58-aae6-f74b25730a2c"],
		"permission": [2, 16],
		"resource": "Role",
	} with data.roles as roles.roles
}

test_put_role_includes_admin_not_granted {
	print("Test: Ensure that updating role is not allowed because it includes admin permissions and has no corresponding admin permissions.")
	main.decision == {
		"allow": false,
	} with input as {
		"user": users.all_role_permissions,
		"body": {
			"name": "user_manager",
			"default": false,
			"permissions": {
				"Process": 9007199254740991,
				"Project": 0,
			}
		},
		"method": "PUT",
		"path": ["roles", "1943cce1-a88f-4c58-aae6-f74b25730a2c"],
		"permission": [2, 16],
		"resource": "Role",
	} with data.roles as roles.roles
}

test_put_role_includes_admin_granted {
	print("Test: Ensure that updating role is allowed because it includes admin permissions and has sufficient admin permissions.")
	main.decision == {
		"allow": true,
	} with input as {
		"user": {
			"roles": ["d19a443b-524a-4054-895b-3fd068b9de42", "d59266f8-0818-4923-8a31-abeff91c4963"]
		},
		"body": {
			"name": "user_manager",
			"default": false,
			"permissions": {
				"Process": 9007199254740991,
				"Project": 0,
			}
		},
		"method": "PUT",
		"path": ["roles", "1943cce1-a88f-4c58-aae6-f74b25730a2c"],
		"permission": [2, 16],
		"resource": "Role",
	} with data.roles as roles.roles
}

test_put_role_not_granted_by_role {
	print("Test: Ensure that updating role is not allowed because requester is not admin and requester has no sufficient permissions by a role.")
	main.decision == {
		"allow": false,
	} with input as {
		"user": users.all_user_permissions,
		"body": {
			"name": "user_manager",
			"default": false,
			"permissions": {
				"Process": 8,
				"Project": 0,
			}
		},
		"method": "PUT",
		"path": ["roles", "1943cce1-a88f-4c58-aae6-f74b25730a2c"],
		"permission": [2, 16],
		"resource": "Role"
	} with data.roles as roles.roles
}

test_put_role_unauthenticated {
	print("Test: Ensure that updating role is not allowed because requester is unauthenticated.")
	main.decision == {
		"allow": false,
	} with input as {
		"body": {
			"name": "user_manager",
			"default": false,
			"permissions": {
				"Process": 8,
				"Project": 0,
			}
		},
		"method": "PUT",
		"path": ["roles", "1943cce1-a88f-4c58-aae6-f74b25730a2c"],
		"permission": [2, 16],
		"resource": "Role"
	} with data.roles as roles.roles
}

# DELETE /api/roles/:id

test_delete_role_admin {
	print("Test: Ensure that deleting a role is allowed because requester is admin.")
	main.decision == {
		"allow": true,
	} with input as {
		"user": users.admin,
		"method": "DELETE",
		"path": ["roles", "1943cce1-a88f-4c58-aae6-f74b25730a2c"],
		"permission": [8, 16],
		"resource": "Role"
	} with data.roles as roles.roles
}

test_delete_role_granted_by_role {
	print("Test: Ensure that deleting a role is allowed because it is allowed by a role.")
	main.decision == {
		"allow": true,
	} with input as {
		"user": users.all_role_permissions,
		"method": "DELETE",
		"path": ["roles", "1943cce1-a88f-4c58-aae6-f74b25730a2c"],
		"permission": [8, 16],
		"resource": "Role"
	} with data.roles as roles.roles
}

test_delete_role_includes_admin_granted {
	print("Test: Ensure that deleting a role is allowed when it includes admin permissions.")
	main.decision == {
		"allow": true,
	} with input as {
		"user": {
			"roles": ["b52a443b-524a-4054-895b-3fd068b9d78c", "d59266f8-0818-4923-8a31-abeff91c4963"]
		},
		"method": "DELETE",
		"path": ["roles", "114db4a8-9109-4f20-b1b3-6efb21dd23d2"],
		"permission": [8, 16],
		"resource": "Role"
	} with data.roles as roles.roles
}

test_delete_role_includes_admin_not_granted {
	print("Test: Ensure that deleting a role is allowed when it includes admin permissions and no sufficient permissions.")
	main.decision == {
		"allow": false,
	} with input as {
		"user": {
			"roles": ["d59266f8-0818-4923-8a31-abeff91c4963"]
		},
		"method": "DELETE",
		"path": ["roles", "114db4a8-9109-4f20-b1b3-6efb21dd23d2"],
		"permission": [8, 16],
		"resource": "Role"
	} with data.roles as roles.roles
}

test_delete_role_not_granted_by_role {
	print("Test: Ensure that deleting a role is not allowed because requester is not admin and requester has no sufficient permissions by a role.")
	main.decision == {
		"allow": false,
	} with input as {
		"user": users.all_user_permissions,
		"method": "DELETE",
		"path": ["roles", "1943cce1-a88f-4c58-aae6-f74b25730a2c"],
		"permission": [8, 16],
		"resource": "Role"
	} with data.roles as roles.roles
}

test_delete_role_unauthenticated {
	print("Test: Ensure that deleting a role is not allowed because requester is unauthenticated.")
	main.decision == {
		"allow": false,
	} with input as {
		"method": "DELETE",
		"path": ["roles", "1943cce1-a88f-4c58-aae6-f74b25730a2c"],
		"permission": [8, 16],
		"resource": "Role"
	} with data.roles as roles.roles
}

# GET /api/role-mappings

test_get_role_mappings_authenticated {
	print("Test: Ensure that authenticated users are not allowed to view PROCEED user role-mappings.")
	main.decision == {
		"allow": false,
	} with input as {
		"user": {},
		"method": "GET",
		"path": ["role-mappings"],
		"permission": 64,
		"resource": "User"
	} with data.roles as roles.roles
}

test_get_role_mappings_granted_by_role {
	print("Test: Ensure that users are allowed to view PROCEED user role-mappings, if it is granted by a role.")
	main.decision == {
		"allow": true,
	} with input as {
		"user": users.all_user_permissions,
		"method": "GET",
		"path": ["role-mappings"],
		"permission": 64,
		"resource": "User"
	} with data.roles as roles.roles
}

test_get_role_mappings_not_granted_by_role {
	print("Test: Ensure that users are not allowed to view PROCEED user role-mappings, if it is not granted by a role.")
	main.decision == {
		"allow": false,
	} with input as {
		"user": users.all_role_permissions,
		"method": "GET",
		"path": ["role-mappings"],
		"permission": 64,
		"resource": "User"
	} with data.roles as roles.roles
}

test_get_role_mappings_admin {
	print("Test: Ensure that admin users are allowed to view PROCEED user role-mappings.")
	main.decision == {
		"allow": true,
	} with input as {
		"user": users.admin,
		"method": "GET",
		"path": ["role-mappings"],
		"permission": 64,
		"resource": "User"
	} with data.roles as roles.roles
}

test_get_role_mappings_unauthenticated {
	print("Test: Ensure that unauthenticated users are not allowed to view PROCEED user role-mappings.")
	main.decision == {
		"allow": false,
	} with input as {
		"method": "GET",
		"path": ["role-mappings"],
		"permission": 64,
		"resource": "User"
	} with data.roles as roles.roles
}

# GET /api/role-mappings/users/:userId

test_get_role_mapping_of_user_authenticated {
	print("Test: Ensure that authenticated users are not allowed to view PROCEED user role-mappings by user id.")
	main.decision == {
		"allow": false,
	} with input as {
		"user": users.self,
		"method": "GET",
		"path": ["role-mappings", "users", "c6ddf0d1-c23d-4a0f-a300-c5fe23c68907"],
		"permission": 64,
		"resource": "User"
	} with data.roles as roles.roles
}

test_get_role_mapping_of_user_self {
	print("Test: Ensure that authenticated users are allowed to view their own PROCEED user role-mappings.")
	main.decision == {
		"allow": true,
	} with input as {
		"user": users.self,
		"method": "GET",
		"path": ["role-mappings", "users", users.self.id],
		"permission": 64,
		"resource": "User"
	} with data.roles as roles.roles
}

test_get_role_mappings_of_user_admin {
	print("Test: Ensure that admin users are allowed to view PROCEED user role-mappings.")
	main.decision == {
		"allow": true,
	} with input as {
		"user": users.admin,
		"method": "GET",
		"path": ["role-mappings", "users", "c6ddf0d1-c23d-4a0f-a300-c5fe23c68907"],
		"permission": 64,
		"resource": "User"
	} with data.roles as roles.roles
}

test_get_role_mappings_of_user_unauthenticated {
	print("Test: Ensure that unauthenticated users are not allowed to view PROCEED user role-mappings.")
	main.decision == {
		"allow": false,
	} with input as {
		"method": "GET",
		"path": ["role-mappings", "users", "c6ddf0d1-c23d-4a0f-a300-c5fe23c68907"],
		"permission": 64,
		"resource": "User"
	} with data.roles as roles.roles
}

test_get_role_mappings_of_user_granted_by_role {
	print("Test: Ensure that users are allowed to view PROCEED user role-mappings, if it is granted by a role.")
	main.decision == {
		"allow": true,
	} with input as {
		"user": users.all_user_permissions,
		"method": "GET",
		"path": ["role-mappings", "users", "c6ddf0d1-c23d-4a0f-a300-c5fe23c68907"],
		"permission": 64,
		"resource": "User"
	} with data.roles as roles.roles
}

test_get_role_mappings_of_user_not_granted_by_role {
	print("Test: Ensure that users are not allowed to view PROCEED user role-mappings, if it is not granted by a role.")
	main.decision == {
		"allow": false,
	} with input as {
		"user": users.all_role_permissions,
		"method": "GET",
		"path": ["role-mappings", "users", "c6ddf0d1-c23d-4a0f-a300-c5fe23c68907"],
		"permission": 64,
		"resource": "User"
	} with data.roles as roles.roles
}

# POST /api/role-mappings

test_post_role_mappings_authenticated_without_roles {
	print("Test: Ensure that authenticated users are not allowed to create new PROCEED user role-mappings.")
	main.decision == {
		"allow": false,
	} with input as {
		"user": users.self,
		"body": [
			{
				"roleId": "d59266f8-0818-4923-8a31-abeff91c4963"
			}
		],
		"method": "POST",
		"path": ["role-mappings"],
		"permission": 64,
		"resource": "User"
	} with data.roles as roles.roles
}

test_post_role_mappings_of_user_admin {
	print("Test: Ensure that admin users are allowed to create new PROCEED user role-mappings.")
	main.decision == {
		"allow": true,
	} with input as {
		"user": users.admin,
		"body": [
			{
				"roleId": "d59266f8-0818-4923-8a31-abeff91c4963"
			}
		],
		"method": "POST",
		"path": ["role-mappings"],
		"permission": 64,
		"resource": "User"
	} with data.roles as roles.roles
}

test_post_role_mappings_of_user_unauthenticated {
	print("Test: Ensure that unauthenticated users are not allowed to create new PROCEED user role-mappings.")
	main.decision == {
		"allow": false,
	} with input as {
		"method": "POST",
		"path": ["role-mappings"],
		"permission": 64,
		"resource": "User"
	} with data.roles as roles.roles
}

test_posts_role_mappings_granted_by_role {
	print("Test: Ensure that users are allowed to create new PROCEED user role-mappings, if it is granted by a role.")
	main.decision == {
		"allow": true,
	} with input as {
		"user": {
			"roles": ["1943cce1-a88f-4c58-aae6-f74b25730a2c"],
		},
		"body": [
			{
				"roleId": "d59266f8-0818-4923-8a31-abeff91c4963"
			}
		],
		"method": "POST",
		"path": ["role-mappings"],
		"permission": 64,
		"resource": "User"
	} with data.roles as roles.roles
}

test_posts_role_mappings_includes_admin_not_granted {
	print("Test: Ensure that users are not allowed to create new PROCEED user role-mappings, if role includes admin permissions but user has no sufficient permissions.")
	main.decision == {
		"allow": false,
	} with input as {
		"user": {
			"roles": ["1943cce1-a88f-4c58-aae6-f74b25730a2c"],
		},
		"body": [
			{
				"roleId": "b52a443b-524a-4054-895b-3fd068b9d78c"
			}
		],
		"method": "POST",
		"path": ["role-mappings"],
		"permission": 64,
		"resource": "User"
	} with data.roles as roles.roles
}

test_posts_role_mappings_includes_admin_granted {
	print("Test: Ensure that users are allowed to create new PROCEED user role-mappings, if role includes admin permissions and user has sufficient permissions.")
	main.decision == {
		"allow": false,
	} with input as {
		"user": {
			"roles": ["b52a443b-524a-4054-895b-3fd068b9d78c"],
		},
		"body": [
			{
				"roleId": "b52a443b-524a-4054-895b-3fd068b9d78c"
			}
		],
		"method": "POST",
		"path": ["role-mappings"],
		"permission": 64,
		"resource": "User"
	} with data.roles as roles.roles
}

test_post_role_mappings_not_granted_by_role {
	print("Test: Ensure that users are not allowed to create new PROCEED user role-mappings, if it is not granted by a role.")
	main.decision == {
		"allow": false,
	} with input as {
		"user": {
			"roles": ["d59266f8-0818-4923-8a31-abeff91c4963"],
		},
		"body": [
			{
				"roleId": "d59266f8-0818-4923-8a31-abeff91c4963"
			}
		],
		"method": "POST",
		"path": ["role-mappings"],
		"permission": 64,
		"resource": "User"
	} with data.roles as roles.roles
}

# DELETE /api/role-mappings/users/:userId/roles/:roleId

test_delete_role_mappings_authenticated_without_roles {
	print("Test: Ensure that authenticated users are not allowed to delete PROCEED user role-mappings.")
	main.decision == {
		"allow": false,
	} with input as {
		"user": users.self,
		"method": "DELETE",
		"path": ["role-mappings", "users", "2e9e3b25-4967-4e99-b9bf-01ba27f94d7c", "roles", "1943cce1-a88f-4c58-aae6-f74b25730a2c"],
		"permission": 64,
		"resource": "User"
	} with data.roles as roles.roles
}

test_delete_role_mappings_admin_granted {
	print("Test: Ensure that admin users are allowed to delete PROCEED user role-mappings.")
	main.decision == {
		"allow": true,
	} with input as {
		"user": users.admin,
		"method": "DELETE",
		"path": ["role-mappings", "users", "2e9e3b25-4967-4e99-b9bf-01ba27f94d7c", "roles", "b52a443b-524a-4054-895b-3fd068b9d78c"],
		"permission": 64,
		"resource": "User"
	} with data.roles as roles.roles
}

test_delete_role_mappings_unauthenticated {
	print("Test: Ensure that unauthenticated users are not allowed to create new PROCEED user role-mappings.")
	main.decision == {
		"allow": false,
	} with input as {
		"method": "DELETE",
		"path": ["role-mappings", "users", "2e9e3b25-4967-4e99-b9bf-01ba27f94d7c", "roles", "1943cce1-a88f-4c58-aae6-f74b25730a2c"],
		"permission": 64,
		"resource": "User"
	} with data.roles as roles.roles
}

test_delete_role_mappings_granted_by_role {
	print("Test: Ensure that users are allowed to delete PROCEED user role-mappings, if it is granted by a role.")
	main.decision == {
		"allow": true,
	} with input as {
		"user": users.all_user_permissions,
		"method": "DELETE",
		"path": ["role-mappings", "users", "2e9e3b25-4967-4e99-b9bf-01ba27f94d7c", "roles", "d59266f8-0818-4923-8a31-abeff91c4963"],
		"permission": 64,
		"resource": "User"
	} with data.roles as roles.roles
}

test_delete_role_mappings_includes_admin_not_granted {
	print("Test: Ensure that users are not allowed to delete PROCEED user role-mappings, because role includes admin permissions.")
	main.decision == {
		"allow": false,
	} with input as {
		"user": users.all_user_permissions,
		"method": "DELETE",
		"path": ["role-mappings", "users", "2e9e3b25-4967-4e99-b9bf-01ba27f94d7c", "roles", "b52a443b-524a-4054-895b-3fd068b9d78c"],
		"permission": 64,
		"resource": "User"
	} with data.roles as roles.roles
}

test_delete_role_mappings_includes_admin_granted {
	print("Test: Ensure that users are not allowed to delete PROCEED user role-mappings, because role includes admin permissions.")
	main.decision == {
		"allow": true,
	} with input as {
		"user": {
			"roles": ["b52a443b-524a-4054-895b-3fd068b9d78c", "1943cce1-a88f-4c58-aae6-f74b25730a2c"]
		},
		"method": "DELETE",
		"path": ["role-mappings", "users", "2e9e3b25-4967-4e99-b9bf-01ba27f94d7c", "roles", "b52a443b-524a-4054-895b-3fd068b9d78c"],
		"permission": 64,
		"resource": "User"
	} with data.roles as roles.roles
}

test_delete_role_mappings_not_granted_by_role {
	print("Test: Ensure that users are not allowed to delete PROCEED user role-mappings, if it is not granted by a role.")
	main.decision == {
		"allow": false,
	} with input as {
		"user": users.all_role_permissions,
		"method": "DELETE",
		"path": ["role-mappings", "users", "2e9e3b25-4967-4e99-b9bf-01ba27f94d7c", "roles", "1943cce1-a88f-4c58-aae6-f74b25730a2c"],
		"permission": 64,
		"resource": "User"
	} with data.roles as roles.roles
}