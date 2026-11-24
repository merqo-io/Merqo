# cron

## Purpose

Scheduled endpoints that Vercel Cron calls. Each is declared in `vercel.json`
and rejects any request without `Authorization: Bearer ${CRON_SECRET}`.

## Contents

- `trials/`: the daily free-trial sweep; see its own README.

## Parent

[api](../README.md)
