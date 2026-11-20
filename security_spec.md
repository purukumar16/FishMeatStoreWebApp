# Firestore Security Specification (Phase 0)

## 1. Data Invariants
1. **User & PII Isolation**: A `/users/{userId}/private/{docId}` document cannot exist without a valid parent `/users/{userId}` document (`exists(...)` Master Gate), and only the owning verified user (`request.auth.uid == userId && request.auth.token.email_verified == true`) or a verified Admin may read or write it.
2. **Role Escalation Prevention**: Every `/users/{userId}` document carries a validated `role` (`'customer' | 'admin' | 'store_incharge'`). Non-admin users can only create `/users/{userId}` with `role == 'customer'` and can never include `role` in owner `update` `affectedKeys`; only verified Admins (`purukumar16@gmail.com` or `/admins/{uid}`) may promote a user's `role` or write to `/admins/{userId}` / `/staffUsers/{userId}`.
3. **Order Ownership & Lifecycle**: A customer order under `/orders/{orderId}` must have `customerUid == request.auth.uid` (or `'guest'` for unauthenticated guest checkout), valid non-empty `contactPhone` and `deliveryAddress`, `status == 'confirmed'` on creation, and server timestamps (`createdAt == request.time`, `updatedAt == request.time`). Terminal states (`delivered`, `cancelled`) are locked against further customer/staff edits. After store acceptance (`allocated`, `butchered_sealed`, `out_for_delivery`), only verified Admins, active Store Staff, or store-scoped Store Admins may update item final weights and recalculate `subtotal`/`total` while preserving `items.size()`, `deliveryFee`, `status`, and `storeId`.
4. **Subscription Ownership**: A subscription under `/subscriptions/{subId}` must match `customerUid == request.auth.uid` on creation and preserve `customerUid` and `createdAt` across all updates.
5. **Feature Flags Restriction**: Only verified Admins (`isAdmin()`) may write to `/storeConfig/{configId}`.
6. **Price Override Authorization**: Only verified Admins or active Store Staff (`isAdmin() || isStaff()`) may write to `/customPrices/{productId}`.
7. **Strict Query Enforcement**: Every `allow list` rule evaluates `resource.data` directly against `request.auth.uid` or verified admin token claims, with zero `get()`/`exists()` inside `allow list`.
8. **Guest Customer Record & OTP Lookup**: Guest customers are keyed strictly by normalized 10-digit mobile ID under `/guestCustomers/{guestId}` (`^[0-9]{10}$`), allowing exact-key `get` for OTP hydration without any unauthenticated `list` scraping, while Root Admin (`isBootstrappedAdmin()`) can list `/guestCustomers` and `/users` for Admin Reports.
9. **Loyalty Points Integrity**: `loyaltyPoints`, `totalLoyaltyEarned`, and `totalLoyaltyRedeemed` on `/users/{userId}` and `/guestCustomers/{guestId}` are strictly numeric counters bounded to `0..1000000`, and order fields (`loyaltyPointsEarned`, `loyaltyPointsRedeemed`, `loyaltyDiscountAmount`) are strictly non-negative bounded numbers verified in `isValidOrder`.

## 2. "Dirty Dozen" Attack Payloads (Must Return PERMISSION_DENIED)
1. **Identity Spoofing on Order Create**: Authenticated User A attempts to create `/orders/FMS-999999` with `customerUid: "user_B"`.
2. **Ghost Field / Shadow Key Injection on User Profile**: Authenticated User A creates `/users/{uid}` with an extra `isAdmin: true` or `role: "Admin"` field (`hasOnly` rejects).
3. **Unverified Email Write**: A user with `request.auth.token.email_verified == false` attempts to create an order or update `/users/{uid}`.
4. **PII Snooping Across Owners**: Authenticated User B attempts `get` on `/users/user_A/private/info`.
5. **Admin Spoofing Without Verified Email**: A user with custom/unverified token `email == "purukumar16@gmail.com"` and `email_verified == false` attempts to write `/storeConfig/features`.
6. **Self-Promotion to Admins Collection**: Non-admin User A attempts `setDoc` on `/admins/{uid}` to grant themselves Admin access.
7. **Status Shortcutting on Order Create**: Customer attempts to create an order directly with `status: "delivered"` instead of `"confirmed"`.
8. **Terminal State Mutation**: Customer attempts to update an order whose `existing().status == "cancelled"` back to `"confirmed"`.
9. **Client Timestamp Tampering**: Client sends a forged past `createdAt` or future `updatedAt` instead of `serverTimestamp()` (`request.time`).
10. **ID Poisoning**: Client attempts to create `/orders/` with a 500-character or slash-containing `orderId` (blocked by `isValidId()`).
11. **Unbounded Array / Resource Exhaustion**: Client submits `items` array with 200 entries or a 50KB string in `deliveryAddress` (blocked by `.size()` bounds).
12. **Blanket List Scraping**: Non-admin User A runs an unfiltered `getDocs(collection(db, 'orders'))` query without `where('customerUid', '==', uid)` (blocked by `allow list` checking `resource.data.customerUid == request.auth.uid`).
