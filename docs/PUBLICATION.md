# Public-source publication review

A pre-publication scan covered all 12 original commits and 572 reachable Git objects, including historical blobs and commit metadata, rather than only HEAD.

## Result

- No tracked live `.env` files, credential prefixes, private-key PEM markers or exact protected environment values were found.
- Values from both owner-authorized environment files were compared in memory without printing them. Nontrivial values of eight or more characters were included, not only variables with secret-like names. Neither file was copied into the repository.
- Every 64-hex match was inspected. Matches were SQLite request fingerprints or SHA-256 asset digests, not wallet private keys.
- Email findings were public GitHub noreply attribution, test fixtures, public service catalog contact metadata, font-license credits or binary false positives. No private contact details or phone numbers were identified.
- Person-name review found internal reviewer aliases and legitimate public source/font-author attribution. Internal reviewer aliases were generalized before publication. Public source attribution and legally required font-license notices remain intact.
- Local path findings identify the build service account and project workspace, not a person's private home directory. The gated proof package was not modified.

The public `main` branch is a new single-root source snapshot, not a push of the original development history. This conservatively excludes the historical internal reviewer labels. Original development history remains local only. Commit attribution uses the owner's existing GitHub noreply identity.

The root ignore file covers dependencies, live environment files, SQLite databases and sidecars, scratch archives, browser profiles and the finished local video. The MP4 is not included in the public snapshot.

## Verification boundaries

Agent: 50 tests passed, build and typecheck passed. Web: 41 tests passed, production build and typecheck passed. These were rerun for this publication. Proof tests were not rerun because the proof/state work is separately owned.

The live recording made one fresh real commission, checked report provenance and exact API readback, then demonstrated mock revoke, refusal and verified mock regrant. Mainnet slots remain pending. Repository publication and local video preparation do not establish hackathon eligibility, public video hosting or portal submission.
