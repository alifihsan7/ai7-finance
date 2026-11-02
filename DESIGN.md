# ai7.finance design direction

Reading this as: a personal-finance dashboard for daily spending decisions, using the owner's Ink & Silver palette choice and glass reference. ENERGY 1 / RHYTHM 2 / MOTION 1.

The owner's reference and Luma design system in this conversation supply the direction. Anti-slop filters the implementation without replacing that direction.

| Decision | Purpose |
| --- | --- |
| Ink canvas #151517, pale text #f3f3f5 | Keep the app neutral and financial values readable. |
| Sidebar #0e0e10, panels #232326, balance gradient #393940 to #29292f | Separate navigation and supporting information, with a subtle silver sheen marking the primary balance. |
| Silver #d4d5dc for selected navigation; green #abd5bd for income and coral #e9a79f for expenses | Keep interface accents neutral and reserve semantic color for financial direction and status. |
| One glass inset within the balance panel | Group income and expense as context for the balance, without blurring every surface. |
| Existing local Geist sans, regular and medium weights | Keep labels and long rupiah amounts readable, without another font download. Tabular numerals align amounts. |
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
