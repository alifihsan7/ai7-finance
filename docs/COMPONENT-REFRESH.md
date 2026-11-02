# Ink & Silver component refresh

## Hard gates

Shared controls retain their existing actions. Dialog focus handling and Escape remain in place; selectors expose expanded state and category filters expose pressed state. No new assets, financial data or calculations were introduced. Buttons and icon actions touched here have 44 px targets. Input boundaries were checked against the actual field surface: dark #747480 / #1d1d20 = 3.65:1, light #858592 / #fdfdfe = 3.58:1. Primary text contrast is 11.46:1 in dark mode and 10.92:1 in light mode.

## Purpose

Primary actions share neutral silver fills and hover states, including exact legacy button aliases. Dialog accent strips and tinted input prefixes were removed. Cards use 20 px radii; controls use 10 px. Category tabs use an underline and explicit selected state. Account and category grids reflow around readable preferred widths rather than viewport-based four/five-column rules. User-selected colors remain as account dots and category markers.

## Identity

ENERGY 1 / RHYTHM 2 / MOTION 1. Ink & Silver remains the palette; the overview balance remains the focal point. Supporting cards stay matte, and financial direction and status keep their semantic colors. Numbers on account/category/goal cards use the existing sans face instead of mixed heavy monospace.

## Verification

Production build passes with existing hook-dependency warnings. Existing overview and dashboard-loading scripts pass. Browser inspection used labeled local fixtures: account and category cards, income filter selection, add-account dialog, selector changes, Escape, transaction table, billing dialog and goals empty state. Account/category page fits 390 px and 768 px without document overflow; the dialog fits 390 px without horizontal overflow. Both themes were inspected. Populated goal/subscription card layouts were not exercised with production records; no production data was changed.
