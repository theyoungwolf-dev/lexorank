---
name: release
description: Prepare a release or add a changeset. Use when the user says "cut a release", "add a changeset", "bump the version", "publish", or asks what goes in the changelog.
---

# Releasing

Versioning is [Changesets](https://github.com/changesets/changesets). Commit messages have no effect on the version — the file in `.changeset/` is the only source of truth.

## Does this change need a changeset?

Only if a consumer of the published package would notice.

| Needs one                          | Does not                                   |
| ---------------------------------- | ------------------------------------------ |
| New or removed export              | CI, tooling, config                        |
| Changed behaviour or signature     | Tests, fixtures                            |
| Bug fix in shipped code            | README, comments                           |
| New error class or error condition | Internal refactor with identical behaviour |

Scaffolding and setup work before the first publish do not need one either — nothing has shipped to compare against.

## Adding one

```sh
pnpm changeset
```

Select the package, choose the bump, write a summary. The summary becomes the changelog line, so write it for someone deciding whether to upgrade: what changed and what they must do, not which files moved.

Pre-1.0, a breaking change is `minor` — semver allows it, and the package is at `0.x` deliberately.

Commit the generated `.changeset/*.md` alongside the code it describes so a reviewer sees both together.

## Cutting the release

1. Merge to `main`. The Changesets action opens a "Version Packages" PR that bumps the version, writes `CHANGELOG.md` and deletes consumed changesets.
2. Review that PR — it is the last point to fix a changelog entry.
3. Merge it. CI publishes to npm with provenance.

Never run `npm publish` or `pnpm publish` locally. Local publishing skips provenance and the version bump.

## Before a release that changes rank semantics

Anything altering which strings are valid, or where a rank lands, is a data contract change. Call it out explicitly in the changeset summary, since existing rows in a consumer's database may no longer be acceptable input. The canonical-form rule (no trailing zeros) is the current example.
