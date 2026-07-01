# Proposal Builder

The Proposal Builder is a feature that allows users to create client-specific proposals by shortlisting properties from the property inventory. 

## Flow Overview

1. **Shortlisting (Frontend):** 
   - A user opens a property (e.g. building) detail page.
   - They click the **Add to Proposal** button.
   - A dialog prompts them to either select an existing proposal or create a new one.
   - The selected property is added as a `ProposalItem` to the chosen `Proposal`.

2. **Managing Proposals (Frontend):**
   - In the `Proposals` section, users can view all their proposals.
   - Clicking on a proposal opens its detail page.
   - The detail page displays a table of all shortlisted properties for that proposal.
   - Users can dynamically select which columns (data points) they want to include or exclude using the "Columns" dropdown.
   - Column selections are persisted in the backend.

3. **Exporting (Frontend to Backend):**
   - The user clicks **Export CSV**.
   - The frontend calls the backend export endpoint, providing the selected columns.
   - The backend validates permissions (e.g., stripping restricted fields like "Owner Phone" for standard workers, unless they are admins).
   - The backend generates a CSV file and sends it back to the client as an attachment.
   - The frontend initiates the download.

## API Documentation

### Proposal Items

#### `POST /proposals/:id/items`
Adds a new property item to the specified proposal.
- **Body:**
  ```json
  {
    "entityType": "building", // or floor, unit
    "buildingId": "uuid-here" // required for building type
  }
  ```
- **Response:** The newly created `ProposalItem`.

#### `GET /proposals/:id/items`
Fetches a paginated list of items in a proposal.
- **Query:** `page`, `limit`
- **Response:** Paginated items along with related entity data (building, floor, unit).

#### `DELETE /proposals/:id/items/:itemId`
Soft deletes an item from the proposal.

### Proposal Configuration

#### `PATCH /proposals/:id/fields-config`
Updates the selected columns for a proposal.
- **Body:**
  ```json
  {
    "selectedFields": ["buildingName", "city", "rentPerSqFt"]
  }
  ```
- **Response:** The updated `Proposal`.

### Proposal Export

#### `GET /proposals/:id/export/csv`
Exports the proposal as a CSV file.
- **Response:** `text/csv` stream containing the proposal data based on the selected fields.
- **Security:** Requires authentication. Restricted fields are omitted if the user is not an `ADMIN`.

## Database Schema Highlights

- **Proposal:** Contains `fieldsConfig` (JSON) to store column preferences.
- **ProposalItem:** Link table with a unique constraint on `[proposalId, entityType, buildingId, floorId, unitId]` to prevent duplicates. Uses `removedAt` for soft deletes.
- **ProposalEntityType:** Enum specifying `building`, `floor`, or `unit`.
