# Security Specification: Clinic Management System

## 1. Data Invariants

1. **Patient Isolation**: A patient record can only be viewed and edited by authenticated operators with clinical history permissions / patient-editing privileges, or by patients who are viewing their own profile matching their identifier.
2. **Appointment Identity**: An appointment creation or status update must be performed by active system users with scheduling permissions.
3. **Immutability of Center Affiliations**: Documents stamped with a specific `centerId` cannot have their `centerId` modified to cross-pollinate centers inadvertently.
4. **Master and User Scope Checks**: A master user can operate globally, whereas center-scoped users are restricted to documents belonging to their assigned `centerId`.

## 2. The "Dirty Dozen" Vulnerability Matrix

| Test Case ID | Target Collection | Payload Description | Expected Result | Hardening Countermeasure |
|---|---|---|---|---|
| TC-01 | `/users` | Modifying another staff's user `role` to 'master'. | `PERMISSION_DENIED` | Role fields are protected by a strict update affectedKeys whitelist. |
| TC-02 | `/patients` | Creating a patient with arbitrary script injections in `dni` ID fields.| `PERMISSION_DENIED` | ID validation helper enforcing format limit regex checks. |
| TC-03 | `/appointments` | Rescheduling a terminal status appointment (e.g. cancelled/present). | `PERMISSION_DENIED` | Rule validates that past/terminal statuses are read-only. |
| TC-04 | `/patients` | Non-owner/non-staff reading private patient contact information directly. | `PERMISSION_DENIED` | Reads require validated permissions on the collection records. |
| TC-05 | `/clinicSettings` | Updating the clinic name using field type `number` instead of `string`. | `PERMISSION_DENIED` | Type checks inside `isValidClinicSettings` validate every key type. |
| TC-06 | `/professionals` | Forcing `telemedicineEnabled` to `true` by a normal reception role user. | `PERMISSION_DENIED` | Permission check requires isDoctor or admin status. |
| TC-07 | `/appointments` | Overwriting the booking date timestamp with an arbitrary client date. | `PERMISSION_DENIED` | Enforced strict server validation requirements if needed. |
| TC-08 | `/users` | An unauthenticated guest reading the registry of user credentials. | `PERMISSION_DENIED` | Root safety catch-all deny rule blocks non-signed in reads. |
| TC-09 | `/priceListItems` | Injecting negative numbers as prices in the treatment list. | `PERMISSION_DENIED` | Range-boundary checking on price field values (> 0). |
| TC-10 | `/patients` | Adding an arbitrary ghost-key `isVerifiedAdmin: true` to a patient record. | `PERMISSION_DENIED` | Map size and elements checking prevent shadow fields injection. |
| TC-11 | `/centers` | Overwriting global center configurations as a guest user. | `PERMISSION_DENIED` | Writing requires active admin status. |
| TC-12 | `/appointments` | Deleting history records of appointments globally. | `PERMISSION_DENIED` | Deletion is gated by appointment creation status checks. |

## 3. Invariant Checks Summary

All write operations are validated against:
- `isSignedIn()` check verifying token authenticity
- Schema conformant validators (`isValid[Entity]`)
- Immutable fields retention (`createdAt`, `centerId`)
- Temporal checks comparing timestamps against `request.time`
