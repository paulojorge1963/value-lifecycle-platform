<!--
Thanks for contributing! Keep PRs focused — one logical change is easier to review.
See CONTRIBUTING.md for setup and conventions.
-->

## Summary

<!-- What does this change and why? -->

## Related issue

<!-- e.g. Closes #123 — or "n/a" -->

## Type of change

- [ ] Bug fix
- [ ] New feature
- [ ] Refactor / cleanup
- [ ] Docs
- [ ] Data model / schema change

## Screenshots

<!-- For any UI change, add before/after screenshots. Delete this section if not applicable. -->

## Checklist

- [ ] `npx tsc --noEmit` passes
- [ ] Matches the surrounding code (TypeScript, Tailwind, VE = blue / VR = emerald, naming & comment density)
- [ ] Verified in the running dev server (`npm run dev`) if the change is user-visible
- [ ] Ran `npm run db:seed` and confirmed the demo still loads (if `prisma/schema.prisma` or seed data changed)
- [ ] Updated docs (README / USER_GUIDE / ARCHITECTURE) if behaviour or setup changed
- [ ] No secrets committed (`.env` stays untracked)
