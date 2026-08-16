# Changesets

This monorepo uses [changesets](https://github.com/changesets/changesets) v3 with
[`changesets/action@v2`](https://github.com/changesets/action).

## Flow

1. `pnpm changeset` — describe changes (writes `.changeset/*.md`)
2. `pnpm version-packages` — bump versions + changelogs
3. `pnpm release` — build + publish (manual fallback)

CI (`.github/workflows/release.yml`) first selects a mode:

- `version`: `changesets/action/version@v2` opens or updates the
  `chore: version packages` PR.
- `publish`: packages are built and packed without OIDC permission, then
  `changesets/action/publish@v2` publishes the tarballs via Trusted Publishing.
- `none`: no release work runs.

Only the final publish job receives `id-token: write`.

## Dependency updates

`update.changeset: true` is set in `pnpm-workspace.yaml`, so `pnpm update` writes a
changeset for every workspace package whose `dependencies`/`optionalDependencies` changed
(`patch`) or whose `peerDependencies` changed (`major`). Use `pnpm update --no-changeset`
to skip it for a single run.

## v3 notes

- Private packages (the playgrounds) are never versioned or tagged — `privatePackages: false`
  replaces the old `ignore` list.
- Prerelease bookkeeping lives in `.changeset/pre/`, not `.changeset/pre.json`.
- `changeset tag` was renamed to `changeset git-tag`.
- `changeset version` exits 1 when there is nothing to release.
