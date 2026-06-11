# vnpt-harness-cli

Public CLI for installing and maintaining VNPT harness bundles.

This repository contains only the public CLI package. It does not contain the
private harness bundle payload.

## Install

Install from this GitHub repository:

```bash
npm install -g github:truongqv12/harness-cli
vnpt-harness --version
```

Private GitHub repository install also works when your Git SSH access is set up:

```bash
npm install -g git+ssh://git@github.com/truongqv12/harness-cli.git
```

Run without installing globally:

```bash
npm exec --yes --package=github:truongqv12/harness-cli -- vnpt-harness --version
```

If this package is published to the npm registry later, use:

```bash
npm install -g vnpt-harness-cli
```

## Usage

```bash
vnpt-harness init --source gitlab:gitlab.example.com/group/vnpt-it-harness --release latest --yes
```

Local bundle development:

```bash
vnpt-harness init --kit-path /path/to/private-bundle --release local --yes
```

Commands:

- `init`: install or update project harness files.
- `install`: compatibility alias for `init`.
- `update`: update this CLI package only.
- `migrate`: migrate installed harness assets for another agent.
- `doctor`: check local CLI, provider, and project state health.
- `config`: manage user or project config.

The CLI does not ship private bundle payloads or default private source values. Provide bundle source explicitly through CLI flags, config, or environment.
