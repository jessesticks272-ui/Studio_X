# LyTune Studio X — Producer Beta Checklist

Use this before inviting more producers or asking anyone to upload valuable music.

## Current beta scope
- Producers can create an account and choose a producer role.
- Producer dashboard links to the Studio workspace.
- The Studio upload code writes beat metadata to Firestore and can upload audio to Firebase Storage.
- Explore is wired to subscribe to published beats in Firestore.
- A feedback form now stores signed-in user feedback in Firestore.
- Checkout is not connected to a payment provider. Do not promise completed purchases, payouts, or automatic license delivery.

## Required manual setup in Firebase Console
1. Open the Firebase project `lytune-studio-x`.
2. In Firestore Database → Rules, review and publish the rules in `firestore.rules` from the repository.
3. Confirm Firebase Authentication has Email/Password enabled. If using Google sign-in, enable Google and add the production domain under Authorized domains.
4. In Storage, verify the bucket is active and review its security rules before allowing producer uploads.
5. Do not assume a GitHub commit publishes Firebase rules. Firestore and Storage rules must be deployed in Firebase Console or through a configured Firebase CLI workflow.

## Smoke test
- [ ] Open the production site in a private/incognito browser window.
- [ ] Create a new test account as a producer.
- [ ] Confirm the account lands on the producer dashboard.
- [ ] Open Studio and upload a test audio file that is safe to share publicly.
- [ ] Confirm the success message appears and the beat is in the producer catalog.
- [ ] Open Explore in another tab and confirm the published beat appears without manually reloading.
- [ ] Open the beat page and test the audio preview.
- [ ] Submit the feedback form and confirm a success message.
- [ ] Sign in as a different account and confirm the feedback record is not readable by that account.
- [ ] Test the same essential steps on a phone-sized screen.
- [ ] Test messaging between two test accounts.
- [ ] Test checkout and confirm it clearly states that payment is not live and makes no charge.

## Release blockers / cautions
- **Audio protection:** the current upload path uses the same downloaded audio URL for preview and full audio. Treat uploaded audio as publicly accessible. Do not upload unreleased masters until preview delivery and protected master delivery are separated.
- **Payments:** checkout is a non-payment placeholder. A secure payment integration, server-side verification, license acceptance, and post-payment delivery are still needed.
- **Rules deployment:** the repository rules need to be published to Firebase. Verify them with two test accounts after publishing.
- **Storage security:** review file-size/type limits and per-user ownership rules before opening uploads broadly.
- **Live verification:** code in GitHub does not prove the Vercel deployment is updated or that the deployed site can reach Firebase. Confirm the production URL and browser console during the smoke test.

## Feedback prompts for invited producers
1. Could you create your account without help?
2. Was it obvious where to upload a beat?
3. Did the beat appear in Explore after publishing?
4. Did the preview play correctly on your phone?
5. What was confusing, broken, or missing?
6. What one feature would make you return next week?
