# Devydtz Workforce

A Windows desktop workstation for specialized AI employees, project tasks, GitHub/Railway discovery and opt-in **local computer control**. Built to be useful without an always-on personal server. The UI runs locally; eligible ChatGPT accounts can use OpenAI's official Sign in with ChatGPT DevKit to run supported model requests in the cloud.

This is **v0.6.0 source/beta**, not a verified, signed Windows release. Connect Office only after a password-protected Office backend exists at `https://office.devydtz.com`. The paired Office bridge token is encrypted locally using Electron safeStorage, and the server never receives ChatGPT credentials. Its Windows installer needs to be built on Windows or by GitHub Actions. Live ChatGPT sign-in, model responses, and Windows desktop-control integration have **not been end-to-end verified on a real Windows machine** in the preparation environment. It does **not** yet provide autonomous 24/7 work, browser computer vision, production deployment write operations, or remote access to the PC.

## Working components

- Clean dark Electron/HTML/CSS desktop interface, saved projects, task board, conversations, employees, approvals, and run history; the separate Knowledge page is deliberately removed
- Six predefined specialists with editable job instructions, plus the ability to add your own
- Automatic role-specific context from model knowledge, local project descriptions and reference details, linked GitHub and Railway resources, and optional public encyclopedia references for clearly public questions; no claims of having downloaded or memorized the entire internet
- Multi-specialist sequential review using connected ChatGPT; individual task execution and individual chats
- ChatGPT local sign-in integration via `@siwc/local` (downloaded by setup script), with credentials encrypted by the OS and kept on the **local computer**
- GitHub and Railway connection slots for read-only repository and project inspection
- Local settings/backup/restore, activity history, desktop notifications and shortcut `Ctrl+Shift+D`
- Optional encrypted Devydtz Office pairing in Settings; the desktop can process remote text-only employee jobs while running using eligible local ChatGPT access. Office requests do **not** execute Windows PC actions.
- **Computer** panel with 24 local actions (see below), advanced JSON tool runner, screenshot viewer, manual operations, and a natural-language employee action loop
- Full computer control session switch, accessible from the app UI, with immediate revoke and an execution audit trail; off by default after every app restart

## Full local computer access

Full Access runs with the rights of the signed-in Windows user. It can inspect and modify files, start or stop programs, run Windows shell commands, move and click the cursor, send keyboard input, use the clipboard, and capture the desktop. It does **not** bypass User Account Control, elevation prompts, antivirus or file permissions. It cannot directly access a PC from Railway or from this chat.

**To enable:** Open the **Computer** tab in the installed app, select **Enable full access**, review the warning and type `FULL ACCESS`. While the switch is on, a locally running AI employee can execute actions without a separate prompt for each action. Tools and status are shown in the same tab. To revoke, select **Stop computer access** or quit the app. Active local computer tool requests are cancelled where supported.

Supported tool IDs: `system_info`, `list_files`, `read_file`, `write_file`, `make_directory`, `move_path`, `delete_path`, `run_command`, `list_processes`, `start_process`, `stop_process`, `screenshot`, `mouse_move`, `mouse_click`, `type_text`, `press_keys`, `read_clipboard`, `write_clipboard`, `open_url`, `list_windows`, `focus_window`, `ui_tree`, `mouse_scroll`, `mouse_drag`. The backend validates tool schemas and has input size/time bounds, action logging and session-scoped access; the AI loop is capped at 12 steps per task. Actions may be irreversible: grant access only if you trust the account, connected model and information being processed.

Some desktop capabilities (mouse, keyboard, screenshot, accessibility inspection, window focus) use Windows PowerShell and Windows Forms and **only work on Windows**. The screenshot action can show an image to the human in the app; the current text-only agent bridge does not provide image interpretation to the model. Computer automation is therefore not guaranteed to complete visual workflows reliably.

## Build on Windows

1. Install [Node.js 22+](https://nodejs.org/) and [Git for Windows](https://git-scm.com/).
2. Extract the source ZIP.
3. Double-click `BUILD-ON-WINDOWS.cmd`. The script installs app dependencies, clones and builds the official Sign in with ChatGPT DevKit, runs tests and builds an unsigned Windows installer.
4. Look for `release/Devydtz-Workforce-0.6.0-Setup.exe`.
5. Open the installed app. In **Settings**, select **Continue with ChatGPT** and follow the supported authorization flow. Model availability and request limits depend on account eligibility.
6. In **Computer**, activate Full Access for the current session if you want the AI employees to operate your machine.

A `.github/workflows/build-windows.yml` is also included to build an installer from a GitHub repository using a Windows runner and publish it as a workflow artifact. That workflow **has not been run yet**.

For local source-only development:

```bash
npm install
npm run setup:chatgpt
npm test
npm start
```

## Security and limitations

- App window uses Electron context isolation, sandboxing and a restricted IPC bridge; the PC controller is not exposed as an HTTP service.
- Never store GitHub/Railway API tokens in project knowledge or AI messages. Integration tokens use Electron safeStorage on the installed device.
- Avoid granting access while highly sensitive data is open. An AI agent could misinterpret instructions or tool outputs and delete/modify data. Maintain backups of irreplaceable files.
- Do not elevate or run the application as administrator unless necessary for a specific task. Windows permission boundaries are intentional.
- Keep passwords and OS credentials private. ChatGPT plan authorization is local and does not turn your subscription into a remotely hosted unlimited AI API.
- AI tooling uses one text decision per call, not a native visual UI-control model. It cannot reliably identify arbitrary screen elements from screenshots.
- GitHub and Railway integrations in this release are read-only. "Review approval" changes the local task status, not external production services.
- Free or subscription-backed model use is subject to actual entitlement, usage limits and terms. No usage is guaranteed to be free or unlimited.

## Tests

Run `npm test` for Node's built-in suite. The source tests cover persistence, run history, imported-backup validation, external-context boundaries, simulated API integration, local file/command tools and session permission checks. UI can be inspected in `PREVIEW.html`, which is an **offline browser preview only** and never receives local PC control permissions.

## ChatGPT sign-in

Only the **Electron installer** produced by `npm run build:win` includes the official DevKit. The older 5.6 MB native installer is NOT a ChatGPT-connected build. First sign-in opens a browser window on the verified OpenAI authorization site, then returns to the local Windows desktop application. Credentials remain OS-encrypted locally. Your ChatGPT account must be eligible and approve plan sharing. No passwords or tokens are manually entered into Devydtz Workforce.

The AI assistant cannot complete sign-in or control your computer from ChatGPT chat itself. The Windows application must run on your computer, and you must complete account authorization in your own browser.


## Built-in context and public reference lookup (v0.6)

There is **no Knowledge navigation category**. Each employee uses its own role instructions and general knowledge provided by the selected ChatGPT model. A project's description and optional reference details are stored inside the **Projects** editor and supplied only for that project. Existing notes from older versions are preserved and automatically included in the correct project's requests; the upgrade does not erase them.

When you explicitly ask clearly public factual questions such as *What is quantum computing?* or *Research Kubernetes*, the app can search Wikipedia through a public API and supply up to three source links to the model. It does not send local project text, secrets or workspace records to that public endpoint. This is intentionally narrow: Wikipedia is an encyclopedia, **not a general real-time web search engine**. For other topics, the model responds from its own knowledge and any authorized project integrations. It must not invent citations or claim to have verified unknown facts.

To disable public reference lookup, open **Settings → Public reference lookup**. Source retrieval happens locally in the Windows app; remote Office messages use the paired local bridge when ChatGPT is connected. The Office server does not receive or store ChatGPT account credentials. This source version has not been end-to-end tested on Windows.

## Windows automatic updates
Starting with version 0.8.0, installed Windows builds check the public `Devydtz-space/Devys-Office` GitHub Releases feed automatically when the app opens and every six hours. The official `electron-updater` provider downloads a new NSIS installer and its SHA512-verified update metadata in the background. When it is ready, go to **Settings → Application updates → Install & restart**. Installation also occurs after a normal app quit if the update has fully downloaded. You can check manually using **Check now**.

**One-time transition:** Earlier v0.6.0 installers have no update client and cannot upgrade themselves; install the v0.8.0 release once. Future releases publish `latest.yml`, `.exe` and `.blockmap` together. The Windows build is currently unsigned; enterprise signature validation/SmartScreen may require a trusted code-signing certificate. Never install an update from a random message or alternate domain.
