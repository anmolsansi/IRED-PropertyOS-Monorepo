# Proposal Builder API Documentation

This document outlines the REST API endpoints created for the Proposal Builder feature.

## Base URL
`/api/v1/proposals`

## Authentication & Authorization
All endpoints require a valid JWT Bearer token.
Worker roles are subject to geographic assignment checks. Workers can only view proposals they created, OR proposals containing properties within their assigned geography. Workers cannot add properties outside their geography to any proposal.

---

## 1. Proposals CRUD

### `POST /`
Creates a new proposal.
- **Body:**
  ```json
  {
    "clientId": "uuid",
    "requirementId": "uuid (optional)",
    "title": "string (optional)",
    "notes": "string (optional)"
  }
  ```
- **Response:** Returns the created `Proposal` object (status defaults to `draft`).

### `GET /`
Lists paginated proposals.
- **Query Params:** `page`, `limit`, `clientId`, `status`, `search`
- **Response:**
  ```json
  {
    "data": [
      {
        "id": "uuid",
        "title": "...",
        "client": { "id": "...", "name": "..." },
        "itemCount": 5,
        "status": "draft",
        "createdAt": "..."
      }
    ],
    "meta": { "total": 10, "page": 1, "limit": 20, "totalPages": 1 }
  }
  ```

### `GET /:id`
Fetches a single proposal.
- **Response:** Proposal object including client details and `itemCount`. Returns 403 if worker lacks geography access.

### `PATCH /:id`
Updates a proposal's basic info or status.
- **Body:** `title`, `notes`, `status`
- **Response:** Updated Proposal object.

### `DELETE /:id`
Deletes a proposal (or soft deletes depending on implementation).

---

## 2. Proposal Items

### `POST /:id/items`
Adds a property (building, floor, or unit) to the proposal.
- **Body:**
  ```json
  {
    "entityType": "building" | "floor" | "unit",
    "buildingId": "uuid (optional based on type)",
    "floorId": "uuid (optional based on type)",
    "unitId": "uuid (optional based on type)",
    "notes": "string (optional)"
  }
  ```
- **Response:** Created `ProposalItem`. Returns 409 Conflict if the item is already active in the proposal. If soft-deleted, it restores the item.

### `GET /:id/items`
Lists all active items in a proposal.
- **Query Params:** `page`, `limit`, `search`
- **Response:**
  ```json
  {
    "data": [
      {
        "id": "uuid",
        "entityType": "building",
        "building": { ... },
        "floor": { ... },
        "unit": { ... }
      }
    ],
    "meta": { ... }
  }
  ```

### `DELETE /:id/items/:itemId`
Soft-deletes a proposal item (`removedAt = now()`).
- **Response:** `{ "success": true }`

---

## 3. Field Configuration & Export

### `GET /export-fields`
Returns the master list of fields available for CSV export.
- **Response:**
  ```json
  {
    "data": [
      {
        "key": "buildingName",
        "label": "Building Name",
        "group": "Basic Info",
        "restricted": false
      },
      {
        "key": "landlordName",
        "label": "Landlord Name",
        "group": "Contact",
        "restricted": true
      }
    ]
  }
  ```
*(Note: If the requesting user is a worker, restricted fields may be omitted or flagged so the UI disables them).*

### `PATCH /:id/fields`
Saves the user's selected columns to the proposal configuration.
- **Body:**
  ```json
  {
    "selectedFields": ["buildingName", "city", "rentPerSqFt"]
  }
  ```
- **Response:** Updated Proposal object containing the new `fieldsConfig`.

### `POST /:id/export`
Generates the CSV file containing the shortlisted properties and only the selected columns.
- **Body:**
  ```json
  {
    "selectedFields": ["buildingName", "city"] 
  }
  ```
  *(Optional: If not provided, it uses the saved `fieldsConfig` from the proposal).*
- **Response:** `text/csv` blob. Updates proposal status to `exported`.
