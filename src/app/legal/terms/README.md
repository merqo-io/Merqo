# terms

## Purpose

Public `/legal/terms` page.

## Contents

- `page.tsx` — exports `legalPageMetadata("terms")` and renders
  `../legal-page-client.tsx` with `doc="terms"` (no `kit`, so the hub view).
  The rendered content is the base
  Terms of Service composed with every per-kit schedule appended (see
  `@merqo/ui`'s `getLegalDocSource`).

## Parent

[legal](../README.md)
