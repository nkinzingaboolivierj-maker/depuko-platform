# Secure private files

- Upload intents are owner-bound and accept only JPEG, PNG, WebP and PDF up to 25 MiB.
- The API creates S3-compatible SigV4 presigned PUT URLs for a private bucket.
- Completion verifies object existence, exact content length and MIME type.
- Files enter quarantine. They become downloadable only when the configured scanner returns `{ "verdict": "clean" }`.
- If storage is absent, upload intent creation returns 503. If scanning is absent, errors, or returns an unknown verdict, the object remains quarantined and cannot be downloaded.
- Download URLs are owner-bound, short-lived (120 seconds), and are never stored or made public.

Required variables: `STORAGE_ENDPOINT`, `STORAGE_BUCKET`, `STORAGE_REGION`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`, `FILE_SCANNER_ENDPOINT`, `FILE_SCANNER_API_KEY`.

The scanner endpoint must accept HTTPS POST with a JSON body containing bucket, key, MIME type and size, and return `clean` or `infected`. Provider onboarding and security review are still required before production use.