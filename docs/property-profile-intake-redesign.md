# Property Profile + Intake Redesign

Branch: `feat/property-profile-intake-redesign`

## Scope

Implement the approved property detail and telecaller intake designs while keeping the temporary Property Intake workflow intact.

## Approved field set

### Property overview
- Posted On
- Building Type
- Building Name
- Property Address
- Google Map
- Owner Contact Details
- Verified No.
- Notes
- Media & Photos

### Building compliance / technical details
- Building Usage
- Building Structure
- Age of Construction
- Sanctioned Map
- Floor Size
- Fire NOC
- OC/CC

### Area details
- Available Floor
- Premises Condition
- Super Area
- Carpet Area
- Loading

### Financials
- Rent
- CAM
- Lease Period
- Escalation
- Security Deposit
- Stamp Duty & Registration
- Rent Free Period

### Amenities & infrastructure
- Lift
- Parking
- Electricity Load
- Space for DG Set
- Space for V Sat
- Space for Signage
- Vitrified Flooring
- Toilets
- Pantry
- Water Charges

## Implementation checklist

- [x] Create fresh branch from `main`
- [x] Make desktop sidebar collapsible and resize content with it
- [x] Move collapse control to the top edge of the sidebar
- [x] Define one shared field contract for Properties and Property Intake
- [x] Redesign Property detail page around the approved field set
- [x] Keep Property detail responsive on smaller screens
- [x] Redesign telecaller Property Intake editor around the same field set
- [x] Keep rider media visible and editable during intake
- [x] Keep Save Draft / Follow-up / Complete workflow
- [x] Preserve existing intake workflow metadata when profile fields are saved
- [ ] Confirm Vercel preview build passes
- [ ] Run end-to-end manual verification on preview
- [ ] Fix any preview/runtime issues discovered during verification

## Storage approach

The new profile-specific fields are stored under `additionalFields.propertyProfile`. Existing intake metadata in `additionalFields` is merged and preserved. Commercial values are also mirrored into `commercialTerms` where appropriate for backward compatibility.

This avoids a database migration for this iteration and lets the field set evolve later without breaking existing property records.

## Manual verification plan

1. Open an existing Intake record created by a rider.
2. Confirm rider media, address and contacts are present.
3. Fill every approved field and click **Save Draft**.
4. Reload and confirm every value persists.
5. Mark the record **Follow-up**, reload, and confirm values remain.
6. Complete the intake and confirm it disappears from Property Intake.
7. Open the resulting record in **Properties**.
8. Confirm Property Overview, Compliance, Area, Financials and Amenities match the Intake values exactly.
9. Collapse and expand the left sidebar and confirm the page width adjusts correctly.
10. Repeat the main flows at desktop, tablet and mobile widths.
