# Feature kinds

When extracting features, scan for these six kinds. Each lists the code patterns that signal it. Use this as a checklist when walking a surface — features are easy to miss if you only look for one kind.

## Tools

Interactive multi-step experiences — wizards, editors, sandboxes.

Look for:

- Modal components with internal state machines
- Multi-step forms (`step`, `currentStep`, stepper components)
- Stateful composition flows that build up a final artifact
- Components that wrap children with shared interactive state

## Interactions

Single-action engagement patterns — like, save, follow, share.

Look for:

- Optimistic-update hooks (`useOptimistic`, manually-rolled optimistic state)
- Toggle actions (the same handler flips state on/off)
- Engagement server actions named like `likePost`, `followUser`, `bookmarkItem`
- Components that render a count and a toggle button together

## Transactions

Money/credit flows — purchase, tip, unlock.

Look for:

- Payment integrations (Stripe, PayPal, Polar, etc.) in imports
- Credit deduction or grant logic (`debit`, `credit`, balance updates)
- Checkout flows, success/cancel callback handlers
- Webhook handlers for payment providers

## Gates

Access control — age verification, NSFW filtering, auth walls.

Look for:

- Middleware that redirects based on session state
- Overlay components that block content behind acknowledgment
- Confirmation dialogs that gate an action
- Components named `*Gate`, `*Wall`, `*Guard`, `Protected*`

## Infrastructure

Backend capabilities used by other features — AI generation, media processing, webhook handlers.

Look for:

- Polling loops for async work (`useEffect` with an interval that fetches status)
- Queue submissions (FAL, Replicate, internal queues)
- External API clients wrapped behind a service
- Webhook receivers that fan results out to multiple features

## Workflows

Multi-step admin or system processes — content review, scan pipelines, approval queues.

Look for:

- Status machines on a record (`pending`, `reviewing`, `approved`, `rejected`)
- Review UIs that walk through a queue of items
- Batch processing scripts or jobs
- Admin pages with bulk-action toolbars

## Choosing the kind

A single file often participates in multiple kinds. Assign the kind that best describes the feature *as a product capability* — a payment webhook handler is **transaction**, not **infrastructure**, even though it's technically backend plumbing.

The kind affects how the UI groups and presents the feature. When in doubt, pick the kind a PM would use to describe the feature to a customer.
