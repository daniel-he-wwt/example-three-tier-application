---
description: List outstanding TODO/FIXME/HACK/XXX markers across the codebase
argument-hint: "[path]"
allowed-tools: Bash(scripts/find-todos.sh:*), Bash(bash scripts/find-todos.sh:*)
---

Run `scripts/find-todos.sh $ARGUMENTS` to scan the repository for outstanding
`TODO`, `FIXME`, `HACK`, and `XXX` markers (defaults to the whole repo when no
path argument is given).

Then present the findings to the user:

- Group the results by file, showing the line number and the surrounding
  comment text for each marker.
- Finish with the total count reported by the script.
- If nothing was found, say so clearly instead of inventing items.

Do not modify any files — this command is read-only.
