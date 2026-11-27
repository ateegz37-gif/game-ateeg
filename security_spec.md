# Security Specification — Ateeg Family Champions (Online Multiplayer)

## 1. Data Invariants
1. **Verified Authentication Required**: Every read and write operation requires a verified Firebase Google user (`request.auth != null && request.auth.token.email_verified == true`).
2. **Room Isolation & Master Gate**: Every player, voice message, custom question, and hall-of-champions entry MUST reference an existing parent `/rooms/{roomId}` document and have `data.roomId == roomId`.
3. **Path Variable Hardening**: Every single-document operation (`get`, `create`, `update`, `delete`) validates document IDs with `isValidId()` (`^[a-zA-Z0-9_\-]+$`, max 128 chars).
4. **Ownership & Tiered Permissions**:
   - **Room Admin / Owner**: `existing().ownerUid == request.auth.uid` OR bootstrapped parent admin email (`ateegz37@gmail.com` with `email_verified == true`). Can update room settings, award & reset season scores, and manage custom questions.
   - **Room Player**: Can create their own player document (`incoming().ownerUid == request.auth.uid`), edit their own name/character/age level, increment their own score during quizzes, and send ephemeral Walkie-Talkie messages (`incoming().senderUid == request.auth.uid`).
5. **Strict Schema & Immutability**: No unknown/ghost fields (`keys().hasOnly(...)`), immutable `ownerUid`, `roomId`, `createdAt`, and server-enforced timestamps (`request.time`).
6. **Zero PII Storage**: No emails, phone numbers, or home addresses are stored in `/rooms` or any subcollection.
7. **Ephemeral Voice Privacy**: Voice messages are strictly capped at `<= 180000` chars (~5s Opus audio), cannot be updated after creation, and can be deleted by the sender, room admin, or after playback completion.

## 2. The "Dirty Dozen" Adversarial Payloads (Must Return PERMISSION_DENIED)
1. **Unauthenticated Room Read**: Reading `/rooms/ateeg2026` with `request.auth == null`.
2. **Unverified Email Admin Spoof**: Updating `/rooms/ateeg2026` with `email: 'ateegz37@gmail.com'` and `email_verified: false`.
3. **Ghost / Shadow Field Injection on Player Create**: Creating `/rooms/ateeg2026/players/p1` with extra key `isAdmin: true`.
4. **Owner UID Spoofing on Player Create**: Creating a player with `ownerUid: 'other_uid'` while signed in as `'attacker_uid'`.
5. **Cross-Player Score Tampering**: Non-admin user attempting to update another user's `/players/{otherId}` points.
6. **Immutable `createdAt` Tampering**: Updating a player document with a modified `createdAt` timestamp.
7. **Client-Forged Timestamp**: Creating a voice message with a client-supplied `createdAt` instead of `request.time`.
8. **Oversized Voice Payload (DoW Attack)**: Creating a voice message with `audioBase64.size() > 180000`.
9. **Path ID Poisoning**: Creating `/rooms/ateeg2026/players/../../evil` or an ID > 128 chars.
10. **Invalid Level Enum Value**: Updating a player with `level: 99` or string `"expert"`.
11. **Non-Admin Season Reset / Champions Forgery**: Non-owner, non-admin user trying to write `/rooms/ateeg2026/champions/fake`.
12. **Blanket Collection Listing Without Room Scope**: Attempting `list` on `/rooms` (denied; clients fetch a specific room by secret code via `get`).
