# QR Studio

A branded QR-code generator you can ship today — no backend, no build step.
Static HTML/CSS/JS, one vendored dependency (`qrcode` by soldair, MIT).

**Free:** custom colors, size, error-correction level, PNG export (with a small
"Made with QR Studio" watermark).

**Pro (one-time unlock):** embed your own logo, export crisp vector SVG for
print, no watermark. Batch CSV export is scaffolded in the UI but not wired
up yet — a natural next feature.

## Run it

```
python3 -m http.server 8000
```

then open `http://localhost:8000`.

## Monetization — how the Pro unlock actually works

This ships with the fastest path to a first sale, with the trade-offs made
explicit so you can harden it later:

1. Create a [Stripe Payment Link](https://dashboard.stripe.com/payment-links)
   for a one-time payment (e.g. $9). Paste its URL into `STRIPE_PAYMENT_LINK`
   in `script.js`.
2. Set the Payment Link's **after payment → redirect** to
   `https://yourdomain.com/?unlock=QRSTUDIO-PRO-2024` (the code must match
   `UNLOCK_CODE` in `script.js` — change this constant to something less
   guessable before you launch).
3. On redirect, the app unlocks Pro in that browser (`localStorage`) and
   strips the query param from the URL. The same code also works if typed
   into the "Already purchased?" box in the unlock modal, so a customer can
   unlock on a second device/browser manually.

**Known limitation:** everyone shares one unlock code, so it can leak (a
buyer posts it publicly, etc.). That's an acceptable v1 trade-off to get a
sale flowing with zero backend. When you have paying customers and want
real protection, the natural upgrade is a Stripe webhook that generates a
unique code per purchase and a tiny KV/DB to check it against — the
`setPro()` / `checkUnlockFromUrl()` functions in `script.js` are already the
seam where that would plug in.

## Where the SVG/logo value comes from

Logo embedding forces error-correction level `H` automatically (30%
redundancy) so the code stays scannable with a logo punched into the middle.
SVG export is genuinely vector (not a rasterized PNG wrapped in a tag), which
matters to anyone printing the code on signage, packaging, or business cards.

## Ideas for next steps

- Wire up the batch CSV → ZIP export (needs a zip library, e.g. JSZip)
- Dynamic QR codes: a short-link redirect backend so the destination URL can
  be edited after the code is printed, plus scan-count analytics — the
  strongest recurring-revenue upgrade, but needs a server + database
- Preset templates (Wi-Fi credentials, vCard, email) instead of raw text
