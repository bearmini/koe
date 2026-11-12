# Contributing to koe

Thank you for your interest in contributing to koe! This document covers the basics for getting started.

## Getting Started

### Prerequisites

- Rust toolchain (install via [rustup](https://rustup.rs/))
- Linux (Ubuntu recommended, X11 required)
- System dependencies:

```bash
sudo apt install libasound2-dev libclang-dev libxkbcommon-dev \
  libx11-dev libxi-dev libxext-dev libxtst-dev libxfixes-dev cmake \
  libgtk-4-dev libadwaita-1-dev libvulkan-dev
```

### Build & Verify

```bash
cargo check        # Quick compilation check
cargo test         # Run tests
cargo clippy       # Lint
cargo build --release  # Release build
```

## Development Workflow

1. **Create a worktree and branch:**

   ```bash
   git worktree add .worktrees/<name> -b <prefix>/<name>
   ```

   Branch prefixes: `feature/`, `fix/`, `chore/`

2. **Implement your changes** in the worktree.

3. **Run checks before committing:**

   ```bash
   cargo fmt --check
   cargo clippy -- -D warnings
   cargo test
   ```

4. **Open a Pull Request** against `main`.

## Code Style

- Run `cargo fmt` before committing.
- Run `cargo clippy` and resolve all warnings.
- Keep functions focused and small.

## Commit Messages

We recommend [Conventional Commits](https://www.conventionalcommits.org/):

```text
feat: add new keybinding for toggle
fix: correct audio device detection on PipeWire
chore: update dependencies
```

## Pull Request Guidelines

- One logical change per PR.
- Include a short description of **what** and **why**.
- Ensure all CI checks pass (`cargo check`, `cargo test`, `cargo clippy`, `cargo fmt --check`).
- Link related issues if applicable.

## CI and AI Review

Pull requests to `main` run the following checks on GitHub-hosted Ubuntu runners:

- `cargo check`, `cargo test`, and `cargo clippy` with GUI enabled and Vulkan disabled,
  plus `cargo fmt --check`. These four checks are required by branch protection.
- `cargo audit`, also run weekly, reports known dependency vulnerabilities and
  maintenance notices. It uses no write token, so it also works on fork PRs.
- Packaging changes build the release binary and `.deb`, then smoke-test the package
  on a clean Ubuntu. Publishing runs separately, only when a `v*` tag is pushed.

GitHub may require a maintainer to approve Actions runs from new contributors.
An approval-pending run is not a failed test. Maintainers should inspect the PR
and its workflow changes before approving; do not switch to `pull_request_target`
to avoid this approval.

CodeRabbit is installed, with repository-specific instructions in
[`.coderabbit.yaml`](.coderabbit.yaml). It reviews in Japanese; its comments
supplement the CI checks and maintainer review. Automatic reviews are enabled for
non-draft PRs, subject to CodeRabbit's service limits.

For public repositories with fewer than 10 stars, CodeRabbit currently requires a
manual trigger even when automatic reviews are enabled. A maintainer can select
**Trigger review** in its status comment, or post:

```text
@coderabbitai review
```

Use `@coderabbitai review` again after a new push to request review of the latest
changes. A skipped or rate-limited CodeRabbit status does not mean the code was
reviewed. Maintainers should read the review result before merging.

References: [CodeRabbit plans and limits](https://docs.coderabbit.ai/management/plans)
and [review commands](https://docs.coderabbit.ai/reference/review-commands).

## Issue Reporting

- Search existing issues before opening a new one.
- Include: OS/distro version, Rust version, steps to reproduce, expected vs actual behavior.
- Logs and error output are always helpful.

## Areas Where Help is Wanted

- **Wayland support** -- reducing X11 dependency
- **Packaging** -- deb, rpm, AUR, Nix, etc.
- **Multi-language dictionaries** -- expanding language coverage
- **Documentation** -- usage guides, examples, translations

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
