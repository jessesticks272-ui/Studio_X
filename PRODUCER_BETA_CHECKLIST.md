# LyTune Studio X — Producer Beta Checklist

Use this before inviting producers or asking anyone to upload valuable music.

## Current product limits
- Producers can create an account, use Studio, and publish beat metadata to Firestore.
- Explore reads published beats from Firestore.
- Checkout is a placeholder. Do not promise purchases, payouts, or automatic license delivery.
- Preview audio is not a paid master download.
- Only upload music you own or have permission to distribute/process.

## Required Firebase and Vercel setup
1. In Firebase Authentication, confirm Email/Password is enabled. If Google sign-in is used, enable it and authorize the production domain.
2. Review and publish firestore.rules to the correct Firebase project.
3. Review and publish storage.rules to the correct Firebase Storage bucket.
4. Confirm Vercel has the Google Workload Identity Federation environment configuration already used by /api/members: GCP_PROJECT_ID, GCP_PROJECT_NUMBER, GCP_SERVICE_ACCOUNT_EMAIL, GCP_WORKLOAD_IDENTITY_POOL_ID, and GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID.
5. Confirm BLOB_READ_WRITE_TOKEN is configured if stem-separation uploads are enabled.
6. Confirm OPENAI_API_KEY and REPLICATE_API_TOKEN are configured only if those external AI features are enabled.
7. GitHub commits do not publish Firebase rules. Deploy rules through Firebase Console or a configured Firebase CLI workflow.

## Security changes on the development branch
The branch build/phase-1-security-foundation contains proposed changes that are not live until reviewed, merged and deployed:
- Ordinary users cannot promote themselves to admin or change their role after account creation.
- Only producer accounts can create or manage beat catalogue records.
- The legacy unauthenticated PostgreSQL beat-create endpoint is disabled; Studio's current write path is Firestore.
- API health checks no longer depend on the legacy PostgreSQL database.
- AI search, Blob upload signing and stem-separation endpoints verify Firebase ID tokens.
- API requests use persistent per-user Firestore rate-limit counters.
- Public preview uploads and private master uploads use separate Firebase Storage paths.
- New private master files do not receive a public download URL from Studio.
- Stem job records are private and tied to the account that started them.

## Important audio privacy limits
- New preview files are intentionally public so artists can listen.
- New full masters use masters/{uid}/... and Storage rules restrict reads to the owning producer. Paid customer delivery is not implemented yet.
- Older files under beats/{uid}/... remain publicly readable for backwards compatibility. Treat those files as public until migrated.
- The AI stem-separation page uploads input audio to public Vercel Blob storage so the processing provider can fetch it. The page displays a privacy warning and the API attempts deletion after processing completes and the status is polled. If the page is closed early, the public input may remain. Do not upload unreleased or confidential audio through that feature.
- Never put a private master URL in a public Firestore beat document.

## Smoke tests required before beta
- [ ] Sign up as a producer and confirm the account receives the producer role.
- [ ] Sign up as an artist and confirm the account receives the artist role.
- [ ] Attempt to change a normal account's role to admin through Firestore; the rules must reject it.
- [ ] Confirm an artist cannot create or modify producer beat records.
- [ ] Upload a preview and confirm it plays in Explore while signed out.
- [ ] Upload a private master and confirm the owner can access it but another account and a signed-out visitor cannot.
- [ ] Confirm the beat document contains a preview URL but no public master download URL.
- [ ] Confirm another user cannot read the first user's stem job record or poll its job ID.
- [ ] Confirm AI search and stem separation reject requests without a valid Firebase ID token.
- [ ] Confirm API rate limits return HTTP 429 after the configured threshold.
- [ ] Test account creation, upload, preview playback and messaging with two separate accounts.
- [ ] Test the same essential workflows on a phone-sized screen.
- [ ] Confirm checkout clearly states that payment is not live and makes no charge.
- [ ] Check the production browser console and Vercel function logs after deployment.

## Remaining launch blockers
- Payment provider integration, server-side payment verification, license acceptance, order records, refunds and producer payouts.
- Secure, time-limited customer master delivery after a verified purchase.
- Migration of legacy public audio files into preview and private-master storage paths.
- Moderation, reporting, dispute handling and support workflows.
- Real analytics and trending signals, with no fabricated plays, sales or earnings.
- End-to-end tests and live two-account verification.

## Feedback prompts for invited producers
1. Could you create your account without help?
2. Was it obvious where to upload a beat and its preview?
3. Could you store a full master privately?
4. Did the preview play correctly on your phone?
5. What was confusing, broken or missing?
6. What one feature would make you return next week?