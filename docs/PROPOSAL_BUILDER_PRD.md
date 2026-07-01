# PRD: Proposal Builder Feature

## 1. Feature Name

**Proposal Builder**

## 2. Feature Summary

The Proposal Builder allows users to create client-specific proposals by shortlisting properties from the property inventory. A user can open any property/building page, click **Add to Proposal**, choose an existing client proposal or create a new proposal, and add that property to the proposal.

Inside the proposal detail page, all shortlisted properties are displayed in a tabular format. Each row represents one shortlisted property. Each column represents a property field such as building name, address, city, area, rent, furnishing status, availability, notes, contact details, and so on.

Each column header has a checkbox. When the user selects a checkbox, that column is included in the exported CSV. When the user unselects a checkbox, that column is excluded from the CSV.

The final output is a CSV file containing only the selected columns and the shortlisted properties for the client. The user downloads this CSV, optionally converts it to a PDF locally or through another tool (PDF generation is NOT part of this scope for now), and shares it with the client.

## 3. Target Audience / User Persona

- **Workers (Brokers, Agents, Telecallers):** They use the platform to search for properties and create proposals for clients. They are restricted by their geographic assignment.
- **Admins:** They can view all proposals and manage them across the entire organization.

## 4. Key Use Cases & User Flow

### A. Creating a Proposal
1. User navigates to a Client profile or the central "Proposals" tab.
2. Clicks "Create Proposal".
3. Selects the associated Client (if not already selected) and optionally names the proposal (e.g., "Bandra Office Options").
4. A blank proposal is created.

### B. Shortlisting Properties (Adding to Proposal)
1. User is browsing the property inventory (e.g., Building list).
2. User clicks on a building to view details.
3. User clicks the "Add to Proposal" button.
4. A modal appears: User selects an existing draft proposal or creates a new one on the fly.
5. The property is added to the proposal. (Duplicate check: if already added, notify user).

### C. Configuring the Proposal View
1. User opens the Proposal Detail Page.
2. A data table displays all added properties (rows) and available data fields (columns).
3. The user can remove properties from the list.
4. The user clicks a "Columns" dropdown to check/uncheck fields.
5. The table preview updates instantly. (Workers can only see fields they are authorized to see; e.g., landlord contact info is restricted).

### D. Exporting the Proposal
1. Once the list and columns are finalized, the user clicks "Export CSV".
2. The backend generates a CSV file with the selected columns for the shortlisted properties.
3. The file is downloaded to the user's device.
4. The proposal status is updated from `draft` to `exported`.

## 5. Functional Requirements

### Backend / Data Model Requirements
1. **Proposal Entity:** Needs fields for `id`, `clientId`, `requirementId` (optional), `title`, `notes`, `status` (draft, exported, sent, accepted, rejected), `fieldsConfig` (JSON array of selected column keys), `exportedAt`.
2. **ProposalItem Entity:** Needs fields for `id`, `proposalId`, `entityType` (enum: building, floor, unit), `buildingId`, `floorId`, `unitId`, `displayOrder`, `notes`, `removedAt` (soft delete).
3. **Geography Constraints:** When a worker accesses a proposal or adds an item, the system MUST verify the worker has geographic access to the properties within that proposal.
4. **Field Configuration Constraints:** Define a master list of exportable fields. Flag certain fields as `restricted` (e.g., landlordName, mobileNumber) so workers cannot export them.

### Frontend Requirements
1. **Proposals List Page:** Table view showing all proposals, filterable by status and client.
2. **AddToProposalDialog:** Component that can be mounted anywhere in the app to add a property to a proposal.
3. **Proposal Detail Page:**
   - Header with status badge and action buttons (Export, Delete).
   - "Columns" dropdown menu with checkboxes grouped by category.
   - Dynamic table rendering based on selected columns.
4. **API Integration:** Ensure React Query mutations properly invalidate cache so the UI updates immediately after adding a property or saving columns.

## 6. Non-Functional / Technical Requirements
1. Use Next.js App Router for frontend pages.
2. Use Radix UI / Shadcn components for Dialogs, Dropdowns, and Tables.
3. Use TanStack React Query for data fetching.
4. Use Prisma ORM for database operations.
5. Implement proper error handling (e.g., `toast.error`) across the UI.
