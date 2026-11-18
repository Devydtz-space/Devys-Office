# v0.4.0 — Devydtz Office pairing

- Added `core/office-bridge.cjs`: encrypted Office connection, remote queue polling, heartbeat and text-only ChatGPT response delivery.
- Added Office controls to desktop Settings, with secure connection state, validation and disconnect.
- Remote Office tasks cannot invoke direct Windows tool actions; local computer Full Access stays a separate, session-only permission.
- Added four Office bridge tests (31 total desktop source tests).
- Live Windows build remains unverified because this environment cannot fetch Electron and the attempted Windows GitHub Actions runner failed before starting steps.

# Devydtz Workforce v0.3.0 — source beta

- Added opt-in Full Access to local Windows computer within the current app session.
- Added local filesystem, shell, process, clipboard, window enumeration and focus, accessibility inspection, keyboard/mouse input, drag/scroll and screenshot actions.
- Added a Computer tab, an advanced tool runner and a natural-language AI action loop (maximum 12 operations).
- Added audit records for computer actions and a stop-access control.
- Preserved existing projects, employees, task board, conversations, runs, approvals, knowledge, and provider connections.
- Added a Windows GitHub Actions build workflow. Windows installer is NOT included or verified.
- Automated tests: 25 passing in current environment. Browser preview checked for basic navigation and JS errors.

See README.md for warnings, installation instructions and current limitations.
