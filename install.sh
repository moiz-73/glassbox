#!/usr/bin/env bash
#
# Glassbox skill installer (POSIX shell).
#
# Copies each skills/<name>/ directory (SKILL.md plus references) from this
# repository into a harness skills directory. Existing skill directories are
# skipped unless --force is given. No network access, no elevated privileges.
#
# Usage:
#   ./install.sh <target> [--dry-run] [--force]
#   ./install.sh --target <target> [--dry-run] [--force]
#   ./install.sh --dir <path> [--dry-run] [--force]
#   ./install.sh --list
#
# Targets:
#   claude    ~/.claude/skills
#   opencode  ~/.config/opencode/skills
#   codex     ~/.codex/skills
#   cursor    ~/.cursor/skills
#   agents    ~/.agents/skills
#   all       every target above
#
# Flags:
#   --list         show skills and targets, then exit
#   --dry-run      print actions without writing anything
#   --force        overwrite existing skill directories
#   --dir PATH     install into a custom skills directory
#   --target NAME  accept a target by flag as well as positionally

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILLS_SRC="$SCRIPT_DIR/skills"

TARGET=""
CUSTOM_DIR=""
DRY_RUN=0
FORCE=0
LIST=0
COPIED=0
SKIPPED=0

usage() {
  echo "usage: install.sh <target> [--dry-run] [--force] [--dir PATH]"
  echo "   or: install.sh --target <target> [--dry-run] [--force]"
  echo "   or: install.sh --dir <path> [--dry-run] [--force]"
  echo "targets: claude, opencode, codex, cursor, agents, all"
  echo "flags:   --list, --dry-run, --force, --dir PATH, --target TARGET"
}

target_dir() {
  case "$1" in
    claude)   echo "$HOME/.claude/skills" ;;
    opencode) echo "$HOME/.config/opencode/skills" ;;
    codex)    echo "$HOME/.codex/skills" ;;
    cursor)   echo "$HOME/.cursor/skills" ;;
    agents)   echo "$HOME/.agents/skills" ;;
    *)        echo "" ;;
  esac
}

list_skills() {
  find "$SKILLS_SRC" -mindepth 1 -maxdepth 1 -type d | sort | while IFS= read -r dir; do
    if [ -f "$dir/SKILL.md" ]; then basename "$dir"; fi
  done
}

install_skill() {
  local skill="$1"
  local dest_root="$2"
  local name dest
  name="$(basename "$skill")"
  dest="$dest_root/$name"

  if [ -e "$dest" ] && [ "$FORCE" -ne 1 ]; then
    echo "skip  $name (already exists at $dest)"
    SKIPPED=$((SKIPPED + 1))
    return
  fi

  if [ "$DRY_RUN" -eq 1 ]; then
    echo "dry-run  would copy $name -> $dest"
    COPIED=$((COPIED + 1))
    return
  fi

  mkdir -p "$dest_root"
  if [ -e "$dest" ]; then rm -rf "$dest"; fi
  cp -R "$skill" "$dest"
  echo "copy  $name -> $dest"
  COPIED=$((COPIED + 1))
}

install_into() {
  local dest_root="$1"
  while IFS= read -r skill; do
    install_skill "$skill" "$dest_root"
  done < <(find "$SKILLS_SRC" -mindepth 1 -maxdepth 1 -type d | sort)
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --list)    LIST=1 ;;
    --dry-run) DRY_RUN=1 ;;
    --force)   FORCE=1 ;;
    --target)
      shift
      if [ "$#" -eq 0 ]; then
        echo "error: --target requires a target" >&2
        exit 1
      fi
      if [ -n "$TARGET" ]; then
        echo "error: multiple targets given" >&2
        exit 1
      fi
      TARGET="$1"
      ;;
    --dir)
      shift
      if [ "$#" -eq 0 ]; then
        echo "error: --dir requires a path" >&2
        exit 1
      fi
      CUSTOM_DIR="$1"
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    -*)
      echo "error: unknown flag: $1" >&2
      usage >&2
      exit 1
      ;;
    *)
      if [ -n "$TARGET" ]; then
        echo "error: multiple targets given" >&2
        exit 1
      fi
      TARGET="$1"
      ;;
  esac
  shift
done

if [ ! -d "$SKILLS_SRC" ]; then
  echo "error: skills directory not found: $SKILLS_SRC" >&2
  exit 1
fi

if [ "$LIST" -eq 1 ]; then
  echo "Skills:"
  list_skills | sed 's/^/  /'
  echo ""
  echo "Targets:"
  for name in claude opencode codex cursor agents; do
    echo "  $name -> $(target_dir "$name")"
  done
  echo "  custom -> pass --dir PATH"
  exit 0
fi

if [ -z "$TARGET" ] && [ -z "$CUSTOM_DIR" ]; then
  echo "error: no target given (pass a target or --dir PATH)" >&2
  usage >&2
  exit 1
fi

if [ -n "$CUSTOM_DIR" ]; then
  echo "source:      $SKILLS_SRC"
  echo "destination: $CUSTOM_DIR"
  echo ""
  install_into "$CUSTOM_DIR"
elif [ "$TARGET" = "all" ]; then
  for name in claude opencode codex cursor agents; do
    dest="$(target_dir "$name")"
    echo "== $name ($dest)"
    install_into "$dest"
  done
else
  dest="$(target_dir "$TARGET")"
  if [ -z "$dest" ]; then
    echo "error: unknown target: $TARGET" >&2
    usage >&2
    exit 1
  fi
  echo "source:      $SKILLS_SRC"
  echo "destination: $dest"
  echo ""
  install_into "$dest"
fi

echo ""
echo "summary: copied=$COPIED skipped=$SKIPPED"
