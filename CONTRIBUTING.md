# Contributing

Thanks for contributing to Ceradon Architect.

## Local development
This repo is a static single-page app. Serve it locally with:

```bash
python -m http.server 8000
```

Then open: <http://localhost:8000>

## Pull request workflow
1. Fork the repo and create a feature branch.
2. Make focused changes with clear commit messages.
3. Update documentation and sample data when behavior changes.
4. Ensure the demo remains offline-first and uses generic sample data only.
5. Open a PR describing the change, tests run, and any deployment notes.

## Standards
- Keep UI text neutral and avoid endorsement or operational claims.
- Preserve schema compatibility whenever possible.
- Use small, well-scoped commits and update `CHANGELOG.md` for release-facing changes.

## Testing
No automated test suite is bundled. If you add tests, document how to run them.
