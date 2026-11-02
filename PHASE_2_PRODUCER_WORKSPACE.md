# Phase 2 — Producer Workspace

## Scope

Phase 2 extends the producer-facing workflow on branch `build/phase-2-producer-workspace`. It is based on the Phase 1 security branch and is not merged or deployed.

## Delivered in this branch

### Studio catalogue
- Producers can save a metadata-only draft without publishing it.
- A release can be published only when a preview URL or preview file exists.
- Existing releases can be edited from Studio, including metadata, tags, price and license selection.
- Existing preview and private-master storage references are retained when editing other fields.
- Producers can publish or unpublish a release from the catalogue.
- Catalogue search and status filters distinguish all releases, published releases and drafts.
- Deleting a release requires confirmation. The Firestore catalogue record is deleted; audio objects in Storage are not automatically removed and may require cleanup.

### Producer dashboard
- Replaces placeholder plays and balance metrics with real catalogue counts: total beats, published beats, drafts and follower count.
- Displays up to five recent releases with actual status and links to edit them in Studio.
- Uses escaped text for release names and metadata.
- Does not invent play counts, earnings or sales.

### Producer profile
- Supports a longer producer journey/story, sound influences and specialities.
- Displays those details on the public creator profile when provided.
- Supports editing for producer accounts and combined artist + producer accounts.
- The profile role label distinguishes combined accounts.

### Data and permissions
- Adds Firestore helper functions for updating and deleting a producer's own beat record.
- Prevents client changes to the beat owner ID in the update helper; Firestore rules still enforce ownership.
- Allows the existing combined `both` role to use producer catalogue/profile permissions, without changing the account role.

## Verification performed

- JavaScript syntax parsing passed for `studio.js`, `firestore.js`, `creator-edit.js`, `creator-profile.js` and the producer dashboard inline module.
- Checked the updated HTML files for duplicate element IDs; none were found.
- Compared the branch against Phase 1: 13 commits ahead and 0 behind at review time.

## Manual verification still required

- Use a producer test account to create a draft, edit it, publish it, unpublish it, and delete a separate test record.
- Confirm published beats appear in Explore and drafts do not.
- Confirm an artist account cannot edit or delete another producer's beats.
- Confirm a combined artist + producer account can manage its own catalogue.
- Confirm preview and private-master references remain unchanged when editing metadata.
- Confirm follower counts match the Firestore follow records.
- Test the producer dashboard and Studio on a phone-sized viewport.
- Confirm a deleted beat's stored audio is cleaned up separately when appropriate.

## Known limitations

- Plays, downloads, sales and revenue are not tracked yet; dashboard does not fabricate these figures.
- No automated audio object cleanup on beat deletion or preview replacement. Orphaned Storage files may remain.
- No secure paid-master delivery, payment verification, license generation, refunds or producer payouts.
- This branch has not been tested in a live browser, Firebase Emulator or deployed Vercel environment.
