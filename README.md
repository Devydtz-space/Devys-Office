# Devys Office

Devys Office is the private-owner task and employee workspace for `office.devydtz.com`. The application is deployed as a **separate** Railway service in the **production** environment of the `devydtz-portfolio` project. It must not replace or alter the existing `devydtz-world` portfolio.

## Status

This repository is under active setup. Do not publish an Office URL until authentication, persistent storage, HTTPS and smoke tests pass. ChatGPT desktop account credentials must never be placed on the server.

## Components

- `index.ts`: Office web app and API (Bun)
- `Dockerfile`: Railway container
- `desktop/`: separate local Windows agent (requires local user authorization)

Do not commit credentials, API keys or pairing tokens.
