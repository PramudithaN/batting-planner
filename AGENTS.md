# Project Rules

## Package Manager & Runtime (Strict)

- **Always use `bun` (`bun install`, `bun run <script>`, `bunx`)** for all package management, script execution, typechecking, and builds in this repository.
- **Never use `npm`, `npx`, `yarn`, or `pnpm`** to install dependencies, run scripts, or generate lockfiles.
- Do not create or commit `package-lock.json`, `yarn.lock`, or `pnpm-lock.yaml`; `bun.lock` is the sole lockfile for this project.
