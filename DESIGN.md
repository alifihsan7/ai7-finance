# ai7.finance design direction

Reading this as: a personal-finance dashboard for daily spending decisions, using the owner's Ink & Silver palette choice and glass reference. ENERGY 1 / RHYTHM 2 / MOTION 1.

The owner's reference and Luma design system in this conversation supply the direction. Anti-slop filters the implementation without replacing that direction.

| Decision | Purpose |
| --- | --- |
| Ink canvas #151517, pale text #f3f3f5 | Keep the app neutral and financial values readable. |
| Sidebar #0e0e10, panels #232326, balance gradient #393940 to #29292f | Separate navigation and supporting information, with a subtle silver sheen marking the primary balance. |
| Silver #d4d5dc for selected navigation; green #abd5bd for income and coral #e9a79f for expenses | Keep interface accents neutral and reserve semantic color for financial direction and status. |
| One glass inset within the balance panel | Group income and expense as context for the balance, without blurring every surface. |
| Existing local Geist Sans, weights 400 / 500 / 600 | Keep labels and long rupiah amounts readable, without another font download. Tabular numerals align amounts; interface text and money do not use monospace. |
| Balance, daily spending, account strip, transaction list | Answer what is available, what can be spent, where it is, and what changed. |
| 28 px main panel, 20 px supporting panels, 10 px controls | Distinguish containers from controls; avoid making every element a pill. |
| 8 / 12 / 16 / 24 / 32 px spacing | Keep related amounts close and independent decisions apart. |
| Eye toggle, plus, ledger direction icons | Communicate privacy, adding an entry, and money direction. Other button arrows are unnecessary. |
| Hover and pressed feedback, no entrance animation | Confirm actions without moving financial information while it is being read. |
| Phone stack, tablet pair, desktop balance and side column | Reflow when financial labels and amounts stop fitting. |
| Initial-based avatar and product-name wordmark | Identify the signed-in person and product without inventing a logo or portrait. |
| Guest, loading, failure, unset-budget states | Missing data must not look like a real zero balance or a safe spending recommendation. |

Light mode uses neutral paper #f3f3f5, ink #24242b and solid surfaces. The balance panel uses silver #dcdce3. Both themes share the same semantic color roles.

Scope of this iteration: dashboard overview, its navigation chrome and shared dialog accessibility. No change to financial calculations or production hosting.

The application fills the viewport without an outer frame or content width cap. The sidebar is a separate rounded panel inset 16 px from the screen edges. A 44 px toggle switches between labeled navigation and an icon rail; the browser remembers the choice. Internal panels retain their spacing and radii for readability.

Shared controls use 10 px radii, 44 px minimum targets and neutral silver focus states. Dialogs and supporting cards use 20 px radii without decorative accent strips. Currency prefixes and selectors remain neutral; financial direction, status and user-selected category colors retain their meaning. Account colors remain visible as a small identifying dot. Account cards reflow from a 300 px preferred minimum instead of forcing five cards across a narrow content region; category cards prefer 320 px to fit labels and amounts. Category filters use a selected underline and explicit pressed state. Exact legacy primary-button classes share the same neutral hover treatment across forms and pages.

Typography uses explicit roles: page title 30 px (24 px on phones), section title 18 px/600, card title 16 px/500, body and controls 14 px, metadata 12 px, inputs 16 px, summary metrics 28 px/600 (24 px on phones), primary balance 36 px/500 (28 px on phones). Long metrics wrap instead of hiding digits. New roles replace page-specific font classes; do not restore heavy monospace figures or 9–11 px metadata. Keep line heights at 1.2 for metrics/titles and 1.4–1.5 for supporting text.

Component consistency: supporting panels and dialogs use the shared 20 px radius, controls 10 px, and compact status/category badges 6 px. The primary balance keeps its 28 px radius; avatars and progress tracks remain circular. Neutral dividers and surface borders share `luma-smokeline`; form boundaries use the stronger field-border token. Status colors retain their meaning. Controls have a minimum 44 px target. Summary grids use one column on phones, two at medium widths, and four from 1440 px so amounts stay readable. Related controls use 8 px gaps, fields/cards 16 px gaps, and panel padding 20–24 px.

Use sentence case for interface headings, labels, buttons, and status badges (for example, “Total pemasukan” and “Catat transaksi”). Preserve acronyms, product names, user-entered names, and internal values. Capitalization is presentation only and must not change account/category identifiers.

Nested tab frames follow the inner control geometry: 10 px control radius + 4 px inset + 1 px outer border = 15 px outer radius. Use the shared tab-group rule for Rencana and Pengaturan rather than the panel radius, so the curves stay concentric.
