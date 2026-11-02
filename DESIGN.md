# ai7.finance design direction

Reading this as: a personal-finance dashboard for daily spending decisions, using the owner's charcoal, warm glass reference. ENERGY 1 / RHYTHM 2 / MOTION 1.

The owner's reference and Luma design system in this conversation supply the direction. Anti-slop filters the implementation without replacing that direction.

| Decision | Purpose |
| --- | --- |
| Charcoal canvas, ivory text | Preserve the requested dark reference with readable financial values. |
| Warm ember on the balance panel | Make the account overview the one focal point. Other surfaces remain matte. |
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

Light mode uses warm paper, dark ink and solid surfaces. The balance panel uses a warm sand tint with dark text; the dark-mode amber treatment stays confined to the balance panel.

Scope of this iteration: dashboard overview, its navigation chrome and shared dialog accessibility. No change to financial calculations or production hosting.
