# Pal · Dinner for Alex

A mobile-first, interactive React prototype of Main Pal coordinating dinner and a ride in Shanghai.

**Live:** https://jamiechou2004.github.io/pal-prototype/

**Exception deep link:** https://jamiechou2004.github.io/pal-prototype/?flow=exception

## Run

```sh
npm ci
npm run dev
npm run build
npx playwright install chromium webkit
npm test
```

Desktop renders a 402 × 874 device. Mobile uses the viewport and safe-area insets. The start menu selects Normal or Exception; Restart, Pause, and Skip wait are available as demo controls. Keyboard mode starts with the sample request. Browser speech recognition is used when available; otherwise the input explains the limitation and offers editable text. No microphone data is sent to an application backend.

## Implemented

- One reducer-driven chat engine; historical cards become non-actionable after plan changes.
- Normal restaurant → scoped address permission → booking → car class → car offer → driver flow.
- 7 PM full: take 8 PM, choose another 7 PM restaurant, or customize to Cantonese. Obsolete ride estimates are marked outdated.
- Natural-language exception choices; cuisine has precedence over numbers. All bookings and ride calls still need an explicit confirmation.
- Address refusal → manual pickup or dinner only; cancellation confirmation for ride-only and the whole plan.
- Working/done/attention pill, parallel work rings, live task sheet, profile and search, reactive carousel dots, edit sheet and reduced motion.
- Real Figma-exported restaurant, car, map, avatar, and Pal artwork served locally.

## Latest Pal decision overrides older spec animation

Main is green, Dining orange, Mobility blue. During task transfer the sender is large and the receiver small (approximately 1 : 0.47). The receiver then grows into the lead role while the sender exits. Specialists do not remain permanent small sidekicks. Main Pal still owns the written conversation, so the title stays “Main Pal”. The reduced-motion version uses static states and text.

The newer Figma role colors (#FFAA7C / #2898FF) are retained in the actual character exports. Green action tokens follow the supplied spec.

## Prototype boundaries

No backend, payment, location tracking, real restaurant bookings or car dispatch. Confirmation numbers, contact details, restaurant addresses, drivers, quotes and routes are illustrative. Restaurant and route state is deterministic. The map is a Figma image with exported route/pin layers, not live navigation. The cancellation fee is a simulated no-fee outcome.

English UI includes Chinese names/addresses for showing to staff. Additional cuisines beyond Shanghainese/Cantonese return a no-results view instead of pretending that an unrelated restaurant matches. New Pal setup is informational only.

Figma sources: https://www.figma.com/design/7ozVnkU0WdZYnjtnra3XSC/Tencent-design-challenge
Key screens and components were read through design context. The Figma Education MCP quota was reached while retrieving the remaining exception screenshots; later variants are implemented from the supplied specification and shared components. No screenshots are used as UI backgrounds. Local `design-reference/` files are excluded from Git.

## Architecture

- `src/engine/script.ts`: typed domain state, demo data and route calculations.
- `src/engine/useChat.ts`: transitions, message history and pauseable timer scheduling.
- `src/engine/intents.ts`: small, deterministic intent parser.
- `src/components/`: reusable chrome, role animation, cards, sheets.
- `src/screens/Profile.tsx`: live profile/search, preserving chat state.
- `tests/flows.spec.ts`: browser journeys in Chromium and mobile WebKit.

GitHub Actions builds and deploys `dist` to Pages on push to `main`.
