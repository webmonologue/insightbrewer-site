# Editorial redesign — implementation notes

- Warm paper / dark ink / muted olive, local Pretendard for Korean and a serif wordmark. Responsive editorial sections rather than sales cards.
- Content is grounded in the existing public About, Service, and `hello-world` article. No identity, employers, clients, metrics, additional posts, or case studies were added. Collaboration topics describe possibilities, not completed engagements or guarantees.
- `/service` remains the collaboration route. Existing article source, contact API, validation module, and contact client script are unchanged.
- `PostPreview.astro` shares the actual article opening, metadata, and reading links between home and archive.
- Metadata now includes Korean locale, site name, article type, theme color, and local font preload. The existing `https://insightbrewer.com` canonical site configuration was deliberately preserved; confirm the intended production domain before any future deployment.

## Repeatable verification

Run `npm run verify`: Astro diagnostics, a fresh production build, and Vitest. `npm test` also builds first so rendered-HTML assertions cannot silently use stale output.

Verified locally:
- Astro check: 17 files, 0 errors / warnings / hints.
- Build: passed; upstream Zod/Rollup pure-annotation warnings remain.
- Vitest: 8 tests passed, including rendered navigation/landmarks, content journey, and accessible contact fields, plus existing validation tests.
- All six public routes at 390px and 1280px: one h1, correct active navigation, no horizontal overflow. Home also checked at 320px.
- All unique internal navigation destinations and local font/favicon returned HTTP 200.
- Contact API invalid same-origin request returned HTTP 400 with the expected validation message. Cross-origin form protection remains active.
- Browser contact feedback: loading, reset after simulated success, input retention after simulated server error, and simulated network error all passed. These UI checks intercepted fetch locally; no email was sent and production delivery was not verified.
- Main, muted, and accent text combinations meet WCAG AA normal-text contrast (minimum checked: 4.75:1).
- Git comparison confirmed the existing article, API, validation module, and client submission script are unchanged.

No commit, push, or deployment was performed. Existing `.omc/` files were not modified.
