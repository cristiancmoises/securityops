# Security Policy

## Supported versions

Only the latest tagged release receives security fixes.

## Reporting a vulnerability

Email **ethicalhacker@riseup.net**. For sensitive reports, use the PGP
key published at https://securityops.co/security.

Please include: affected version, browser + version, reproduction
steps, and impact assessment. You will receive an acknowledgment
within 72 hours.

## Scope

In scope: the extension code in this repository (background, content
scripts, popup/options pages, DNR rule generation, proxy handling,
storage validation).

Out of scope: upstream blocklist content (hagezi, chadmayfield),
browser bugs, and the securityops.co website (report those separately).

## Verification

Every release ships `SHA256SUMS`. Verify downloads before installing:

```sh
sha256sum -c SHA256SUMS
```
