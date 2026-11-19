# Security Specification - Field Tech

## 1. Data Invariants

- **User Ownership**: A user document can only be created by the user themselves with a default role (`technician`), default trade (`general` or invited trade), and orgCode.
- **Organization Isolation**: Users can only read/write data sharing their `orgCode`.
- **Clock Integrity**: A `timeEntry` must belong to the user (`userId`) who created it and match their `orgCode`. Only the user can clock in/out; managers can amend/delete org entries.
- **Ticket / Work Order Lifecycle**: Multi-trade work orders (`mason`, `carpenter`, `framer`, `hvac`, `electrician`, `plumber`, `welder`, `roofer`, `it`, `general`) can be created by authenticated users in the same org with bounded trade/category/permit/materials/assetId metadata. Technicians may only update `status`, `assignedTo`, `updatedAt`, and `materials`.
- **Equipment Assets & QR Labels**: Equipment assets require valid `orgCode` membership, strict document ID format (`isValidId`), bounded specs (`name`, `type`, `status`, `assetTag`, `qrCode`, `serialNumber`), and restrict delete operations to admins/dispatchers.
- **Message Integrity**: Messages must have the correct `senderId` and `orgCode`.
- **Admin Overrides**: Managers/Admins can perform management tasks within their org.

## 2. The "Dirty Dozen" Payloads

### P1: Identity Spoofing (Create User)
**Target**: `/users/another_user_uid`
**Payload**: `{"uid": "another_user_uid", "email": "evil@attacker.com", "role": "manager", "orgCode": "ACME"}`
**Result**: `PERMISSION_DENIED` - User can only create their own document with role 'technician' and orgCode 'DEFAULT'.

### P2: Organization Escape (Read Ticket)
**Target**: `/tickets/some_ticket_id` (Org: 'ACME')
**User**: `orgCode: 'EVIL_CORP'`
**Result**: `PERMISSION_DENIED` - User cannot read tickets from a different org.

### P3: Resource Poisoning (Malformed ID)
**Target**: `/tickets/../illegal/path`
**Result**: `PERMISSION_DENIED` - Path validation prevents path injection.

### P4: Clock-In Forge (Different User)
**Target**: `/timeEntries/new_entry`
**Payload**: `{"userId": "victim_uid", "orgCode": "ACME", "status": "active", "clockIn": "request.time"}`
**Result**: `PERMISSION_DENIED` - `userId` must match `request.auth.uid`.

### P5: Clock-Out Hijack (Immutable Field)
**Target**: `/timeEntries/entry_id` (Update)
**Payload**: `{"clockIn": "old_time", "userId": "attacker_uid", "status": "completed"}`
**Result**: `PERMISSION_DENIED` - `userId` and `clockIn` are immutable.

### P6: Message Shadow Field
**Target**: `/messages/msg_123`
**Payload**: `{"text": "Hello", "senderId": "me", "isVerified": true, "orgCode": "ACME"}`
**Result**: `PERMISSION_DENIED` - Schema validation blocks shadow fields like `isVerified`.

### P7: Admin Escalation (Self-Promote)
**Target**: `/users/my_uid` (Update)
**Payload**: `{"role": "manager"}` (Original: "technician")
**Result**: `PERMISSION_DENIED` - Users cannot update their own role.

### P8: Orphaned Record (Ticket without Org)
**Target**: `/tickets/t1`
**Payload**: `{"title": "Broken PC", "status": "open", "orgCode": ""}`
**Result**: `PERMISSION_DENIED` - `orgCode` must be a valid string.

### P9: Denial of Wallet (Large Payload)
**Target**: `/messages/msg_1`
**Payload**: `{"text": "A" * 1000000, ...}`
**Result**: `PERMISSION_DENIED` - String size limits enforced.

### P10: State Shortcut (Ticket Resolving)
**Target**: `/tickets/t1` (Status: 'open')
**Action**: Update status to 'resolved' without being assigned.
**Result**: `PERMISSION_DENIED` - Specific actions restricted by role/assignment if enforced.

### P11: Invite Spoofing
**Target**: `/invites/inv_1`
**User**: Technician
**Action**: Create invite.
**Result**: `PERMISSION_DENIED` - Only admins/managers can create invites.

### P12: PII Leak (User Email Search)
**Target**: Search `/users` where `email == 'boss@acme.com'`
**User**: Any authenticated user
**Result**: `PERMISSION_DENIED` - List operations on `users` must be constrained to org members or prohibited for certain queries.

## 3. Test Runner (Draft)

```typescript
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';

// ... (Standard Firestore test setup) ...

test('Should deny user from creating a ticket in another org', async () => {
    const db = testEnv.authenticatedContext('user_1', { orgCode: 'ORG_A' }).firestore();
    await assertFails(setDoc(doc(db, 'tickets', 't1'), { orgCode: 'ORG_B', ... }));
});
```
