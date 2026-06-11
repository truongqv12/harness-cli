# vnpt-harness-cli

Public CLI for installing and maintaining VNPT harness bundles.

This repository contains only the public CLI package. It does not contain the
private harness bundle payload.

## Install

Install from this GitHub repository:

```bash
npm install -g github:truongqv12/harness-cli --install-links=true
vnpt-harness --version
```

Use `--install-links=true` for Git sources. With `install-links=false`, npm can
leave the global package as a link to a temporary git checkout on Windows.

Private GitHub repository install also works when your Git SSH access is set up:

```bash
npm install -g git+ssh://git@github.com/truongqv12/harness-cli.git --install-links=true
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

Set the private bundle source once:

```bash
vnpt-harness config set source gitlab:<gitlab-host>/<group>/<vnpt-it-harness-repo>
vnpt-harness init --release latest --yes
```

You can also set `VNPT_HARNESS_SOURCE` for a shell session or pass `--source`
per command.

One-off source:

```bash
vnpt-harness init --source gitlab:<gitlab-host>/<group>/<vnpt-it-harness-repo> --release latest --yes
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

The CLI does not ship private bundle payloads or hardcoded private source
values. Configure the source once with `vnpt-harness config set source`, set
`VNPT_HARNESS_SOURCE`, or pass `--source` explicitly.
