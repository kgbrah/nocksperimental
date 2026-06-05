# Private Workspaces

Private workspaces are the commercial surface for team-scoped NockApp lab runs.

The MVP data source is `src/data/private-workspaces.json`, with a public JSON route at `/api/workspaces` and a hosted page at `/workspaces`.

Each workspace detail route also exposes a workspace evidence capsule at `/api/workspaces/{workspaceSlug}/evidence`. The capsule binds workspace retention, report ids, generated report links, badge ids, and the latest snapshot root into verifier inputs for `/api/workspaces/evidence/verify`.

Workspace detail routes also expose a non-secret upload policy at `/api/workspaces/{workspaceSlug}/upload-policy`. The policy defines report upload claims, retention, artifact size limits, and the future authenticated token gate without issuing public upload secrets.

The upload token gate at `/api/workspaces/{workspaceSlug}/upload-token` is protected and returns an auth challenge instead of a public token until a signing key is configured. With `NOCKS_WORKSPACE_UPLOAD_TOKEN_SIGNING_KEY` set, the same gate can issue a signed upload token behind the workspace upload key boundary, and `/api/workspaces/upload-token/verify` verifies the token without echoing its raw value.

Each workspace records:

- private visibility
- plan tier
- seat count
- report retention
- supported fakenet environments
- covered lifecycle stages
- member role counts

This keeps the 3-6 month build focused on paid workflow primitives without adding authentication, billing, or storage before the report contract is stable.

The next production step is to add authenticated membership and storage-backed reports behind the existing signed upload token gate.
