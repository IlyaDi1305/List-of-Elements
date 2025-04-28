# List of Elements

A fullstack application with:

- Backend: Node.js + Express
- Frontend: React + Infinite Scroll
- Storage: Local JSON files (no database)

## Features

- Huge dataset handling (1,000,000 elements)
- Infinite scrolling
- Search by name
- Drag-and-drop reordering
- Multi-select with checkboxes
- State persistence (selection and order are saved)
- Clean modern UI
- Loading spinner during data fetch

## Project Structure

```
/backend
  - index.js (Express server)
/client
  - public/
    - index.html (includes favicon)
  - src/
    - App.tsx (React app)
    - api.ts (API requests)
    - Table.tsx (Table component)
```

## Scripts

From the root:

```bash
# Install dependencies
npm install

# Run the backend
npm run server

# Run the frontend
cd client
npm install
npm start
```

Or combine backend + frontend for production.

---
