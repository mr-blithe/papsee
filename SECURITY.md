# Security policy

PapSee stores PAP therapy imports. That is special category personal data under the GDPR and Turkey's KVKK: it
identifies a person and describes their treatment. Security reports are taken seriously here for that reason, not
as a formality.

## Reporting a vulnerability

Report privately, through GitHub's private vulnerability reporting:

**<https://github.com/mr-blithe/papsee/security/advisories/new>**

Please do not open a public issue, and please do not post it anywhere public first. If GitHub advisories are not
available to you, use the contact page on the hosted instance and say only that you have a security report, without
detail, and you will get a private channel back.

Useful things to include: what you did, what happened, what you expected, and whether you needed an account. A
proof of concept helps. A guess at severity is welcome but not required.

## What to expect

This is a project maintained by one person in their own time, so these are honest targets rather than an SLA:

- Acknowledgement within three days.
- An assessment, and either a fix or an explanation of why it is not one, within thirty days.
- Credit in the advisory if you want it, and none if you would rather not be named.

## Scope

In scope: this repository, and the hosted instance it runs.

Particularly interesting:

- Anything that lets one account read, modify or delete another account's imports, days, events, files or profile.
- Anything that gets a night, a session, an event, a setting or a filename out to a third party, analytics
  included.
- Authentication and session handling, the demo mode read only boundary, and the import and commit routes.
- Anything that writes into a reader's history from a crafted request.

Out of scope: findings that require a compromised device or browser, missing hardening headers with no demonstrated
impact, automated scanner output with no working proof of concept, denial of service by volume, social engineering,
and reports about third party services rather than PapSee itself.

Please do not test against other people's accounts or data. Create your own, or self host a copy, which takes one
command and is documented in the [README](README.md).

## Self hosted instances

If you run your own instance, its security is yours. At minimum: keep `BETTER_AUTH_SECRET` secret and unique, serve
it over HTTPS, do not expose the Postgres port to the internet, keep the images updated, and back up the database
volume. A vulnerability in a self hosted deployment's configuration is not something this project can fix for you,
but a vulnerability in what this repository ships absolutely is, so report it.

## Supported versions

PapSee is in beta and there is no release branch yet. Fixes land on the default branch, and self hosted instances
are expected to track it.
