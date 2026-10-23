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

Desktop renders a 402 × 874 device. Mobile uses the viewport and safe-area insets. The start menu selects Normal or Exception; Restart, Pause, and Skip wait are available as demo controls. Focusing the initial message field fills the sample request. Browser speech recognition is used when available; otherwise the input explains the limitation and offers editable text. No microphone data is sent to an application backend.

## Implemented

- One reducer-driven chat engine; historical cards become non-actionable after plan changes.
- Normal early location permission → restaurant → booking → car class → car offer → driver flow.
- 7 PM full: take 8 PM, choose another 7 PM restaurant, or customize to Cantonese. Obsolete ride estimates are marked outdated.
- Natural-language exception choices; cuisine has precedence over numbers. All bookings and ride calls still need an explicit confirmation.
- Address refusal → manual pickup or dinner only; immediate stops for planning, and task selection plus confirmation for booked tables or cars.
- Working/done/attention pill, parallel work rings, live task sheet, profile and search, reactive carousel dots, edit sheet and reduced motion.
- Updated bilingual Translate Sheet: English/Chinese direction switching, destination-aware copy, browser speech playback, full-screen display, and a clearly labeled sample driver reply retained in chat. Matches Figma nodes `199:9863` and `199:9897`.
- Real Figma-exported restaurant, car, map, avatar, and Pal artwork served locally.

## Refined interaction rules

The October refine checklist takes precedence over the original spec. The header always returns to green Main Pal: Idle when off, Done on completion, Attention when a decision is needed. During specialist work, Main stays large with a small incoming partner; Dining leads when both work. Independent orange/blue specialists remain in task-specific content.

The text-first composer opens typing on focus and returns to idle after send. Recording uses browser speech recognition when available, with stop/send controls and a text fallback. The reaction badge hugs the bubble with 16 px bottom padding and a 16 px right inset, including multiline messages.

Desktop scales the 402 × 874 phone to fit the viewport. Flow selection, restart, pause and skip live in the desktop panel; mobile debugging is available only with `?debug=1`. The in-phone More menu contains Profile only.

Cancelling the ride preserves pending dinner confirmations and restores dinner processing. Cancellation cards report each task separately. Restaurant names, economy fares, journey durations and prices match the saved Figma design contexts; timing and all displayed fare values share one route function.

## Round 2

Location permission comes immediately after Looks good, with Allow for tonight, Allow once, and Don't allow. Refusal still starts Dining; Mobility waits for a manually provided pickup or can be skipped.

All nine restaurant cards explain the recommendation. Normal and exception flows finish with a dynamic Tonight's plan card and the relevant change note. Cancel… remains available while a task is active. The task picker and alert preserve selection on Go back, report each Pal separately, and ask about an active ride after table cancellation. In-flight bookings show Stopping and normally stop before assignment. A late booking-success response reopens the picker and requires confirmation before undoing it. Stopping an unbooked ride preserves pending dinner work.

Only the desktop introduction and demo controls toggle English/Chinese. The phone UI and conversation remain English.

## Additional refine-2 requirements

The seven desktop entries each start the relevant scenario; deep links use `?flow=normal`, `exception`, `cancel-ride`, `cancel-all`, `decide`, `vague`, or `stopping`. Natural-language choices are scripted, context-aware interpretations followed by Yes/No confirmation, not a live language-model integration. Custom preferences are retained and echoed for confirmation; they accompany the illustrative catalogue search rather than querying live restaurants.

Recommendation cards follow the 370 px component, including the 96 px photo, SVG info tags, two-line explanation and dark-green actions. Each booking card has a task-scoped Cancel shortcut that remains opaque while answered content dims. Customize includes Anything else?, and No preserves the draft. White-on-green text controls use #067A3E; the character artwork and activity rings retain the vivid accent.

## Prototype boundaries

Translation text and driver replies are scripted demo content, not live translation. Driver input uses a sample reply; it does not record or translate arbitrary speech. Chinese playback uses available browser voices.

No backend, payment, location tracking, real restaurant bookings or car dispatch. Confirmation numbers, contact details, restaurant addresses, drivers, quotes and routes are illustrative. Restaurant and route state is deterministic. Comfort/Premium quotes for secondary restaurants not specified in Figma are illustrative extensions; source-specified quotes for Longtang, Plane Tree and Pearl are retained. The map is a Figma image with exported route/pin layers, not live navigation. Cancellation charges are outside the prototype scope and are not displayed.

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
