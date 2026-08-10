# Branch Workflow for Epic 1 (Authentication & Profile)

This repository is organized to showcase individual contributions by story while enabling sequential Pull Requests (PRs) that build up to the full Epic 1 implementation.

## Story Folders at Root
- `01_user_auth_login/` – Story A (Dishan D)
- `02_password_reset/` – Story B (Dhruv Jain)
- `03_profile_management/` – Story C (Suman Rao)
- `04_role_access_control/` – Story D (Harshaa Vardhana KV)

Each folder contains a README describing scope, endpoints, and files touched in the main Node/Express app. Team members push changes relevant to their story and reference the folder in the PR description.

## Branching
Create feature branches (one per story):
- `feature/user-auth`
- `feature/password-reset`
- `feature/profile-management`
- `feature/role-access-control`

## PR Sequence (merge in order)
1. `feature/user-auth` → main
2. `feature/password-reset` → main
3. `feature/profile-management` → main
4. `feature/role-access-control` → main

Merging in this order ensures the repo cumulatively reaches the final Epic 1 implementation.

## PR Requirements
- Descriptive title, e.g., "Implement JWT Login Module (US-001)"
- Link to the relevant story folder (01..04) and list of app files changed
- Reviewer: 1+ approval required
- All checks pass (if CI enabled)

## Notes
- Do not commit directly to `main`.
- Each PR should be focused: only changes needed for that story.
- If a later PR depends on earlier files, rebase onto the updated `main` before opening the PR.

## Testing each story locally (without duplicating the whole app)
Use the helper to spin up a sandboxed, runnable copy of the repo with that story’s overlay applied.

Steps:
1. Ensure you’re at the repo root.
2. Run the script with a story folder name:

	```bash
	scripts/apply_story.sh 01_user_auth_login
	# or
	scripts/apply_story.sh 02_password_reset
	scripts/apply_story.sh 03_profile_management
	scripts/apply_story.sh 04_role_access_control
	```

3. Follow the on-screen instructions (cd into `sandbox/<story>`, run `npm install`, then `./start-dev.sh` or `node server.js`).

This avoids copying the entire frontend/backend into every story folder. Each story folder only contains the files that change at that stage (controllers, routes, models, middleware, optional config/frontend). The script builds a runnable snapshot for validation.
