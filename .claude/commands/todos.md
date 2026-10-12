List every outstanding TODO/FIXME/HACK/XXX marker in this codebase.

Search the whole repository (skip `.git`, `node_modules`, build output, and
other ignored directories) for comments or notes containing any of these
markers: `TODO`, `FIXME`, `HACK`, `XXX`. A good way to do this is:

```bash
grep -rn --exclude-dir={.git,node_modules,.next,dist,build} \
  -E "TODO|FIXME|HACK|XXX" .
```

Then present the results grouped by file, with the line number and the
surrounding context, so the todo can be found quickly. For each item include:

- File path and line number
- The raw comment text
- A one-line guess at what tier/area it belongs to (web, api, db,
  infrastructure, etc.), based on the file's location

If no markers are found, say so explicitly rather than returning an empty
list. Do not modify any files — this command is read-only.
