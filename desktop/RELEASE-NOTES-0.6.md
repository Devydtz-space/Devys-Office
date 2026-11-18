# Devydtz Workforce v0.6 — source update

## Changed

- Removed the standalone Knowledge navigation category, quick-access shortcut and command-palette shortcut.
- Existing saved notes remain intact and continue to inform employees invisibly, according to project association.
- Added a project-specific reference field in the Projects editor, so information belongs to its actual project rather than a separate knowledge screen.
- Added an opt-out public reference lookup for explicitly public encyclopedic questions, with Wikipedia titles and source URLs attached to the specialist's model prompt.
- Public lookup rejects likely private/credential prompts and is intentionally limited to encyclopedia search; it is **not** an unrestricted web-browsing or fact-verification system.
- Role-specific prompts remind the employees not to invent actions, test results, or sources.
- Paired mobile Office jobs can receive the same public-reference lookup when processed on the desktop, without sending ChatGPT tokens to Railway.

## Verification

- 37 local Node tests passed.
- Electron native `.exe` NOT rebuilt or tested. The existing 5.6 MB native installer is the older limited app and is NOT upgraded by this ZIP.
- A proper Electron Windows installer requires a working Windows CI runner or a local Windows Node.js build with network access to npm and the official SIWC DevKit.
- The initial GitHub Actions installer run on the isolated branch failed before useful job logs were made available; no installer artifact was produced.
- The existing Office project is still not deployed at `office.devydtz.com`; cloud connectivity and ChatGPT authorization are NOT end-to-end verified.

## Privacy

Never provide passwords, recovery keys, payment details or private tokens in prompts or external search queries. The public reference tool receives only a short query when it classifies the request as public; it does not send private project descriptions, repositories or local files to Wikipedia. No feature can load 'all knowledge in the world' into a local PC or grant unlimited live knowledge for free.
