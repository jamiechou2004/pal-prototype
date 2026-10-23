# Pal refinement · 2026-10-23

Implemented against `Pal-web-prototype-refine.md`, with the original spec and saved Figma contexts supplying component and restaurant details. The refine document wins where the documents differ; the user's subsequent right-edge reaction alignment is retained.

- Text-first composer: idle, typing, recording, stop/send, browser voice support and fallback.
- Header: green Main by default, Main with a small specialist while Working, Main Done/Attention afterward. Full Pal names, 14 px minis in 20 px spinning discs, Dining-first overlap, attached sub-pill, reduced-motion support.
- Phone UI: Profile-only glass menu, chevron back, masked phone, one animated thinking ellipsis. Desktop controls stay outside the device; mobile controls require `debug=1` and disappear under sheets.
- Layout: scaled 402 × 874 desktop device fits 1280 × 800 and 1440 × 900; phone uses full viewport. Existing car spacing and reaction alignment preserved.
- State: ride-only cancellation keeps dinner confirmation cards usable; pending dinner processing resumes. Cancellation summaries distinguish booked, waiting, in progress and not-called tasks.
- Content: natural-language changes echo the understood decision before work; handoff events precede booking text and include both minis where applicable. All nine restaurants use Figma names, prices, distances, durations and economy ranges; timing follows the selected route.
- Sheets: cuisine chips and change-aware edit action; Chinese fullscreen only in Show to driver; reverse translation has no fullscreen action; Chinese TTS retained.

## Verification

30 Playwright cases passed across Chromium and mobile WebKit, including all dinner branches, cancellation recovery, speech-recognition mocks/fallback, translation, profile/search, reduced motion, source data, and desktop fit. Mobile idle/working screenshots were visually inspected after animations settled.

## Prototype limits

No actual reservations, rides, payments, live location, or translation backend. Driver reply is scripted sample content. Browser speech recognition and TTS depend on browser/platform support. Source-unspecified Comfort/Premium quotes for secondary restaurants remain illustrative extensions. These details live in documentation rather than the phone's product flow.
