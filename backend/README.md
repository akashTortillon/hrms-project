# HR Management System Backend

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure environment:
   - Create a `.env` file in this directory.
   - Copy content from `.env.example`.
   - Update `DB_URL` if needed (defaults to local MongoDB).

3. Run the server:
   ```bash
   npm run dev
   ```

## API Endpoints

### Masters (Company Structure)

#### Departments
- **GET** `/api/masters/departments` - Get all departments
- **POST** `/api/masters/departments` - Add a new department
  - Body: `{ "name": "HR", "status": "Active" }`
- **PUT** `/api/masters/departments/:id` - Update a department
- **DELETE** `/api/masters/departments/:id` - Delete a department

#### Branches
- **GET** `/api/masters/branches` - Get all branches
- **POST** `/api/masters/branches` - Add a new branch
  - Body: `{ "name": "Dubai Branch", "location": "Dubai", "status": "Active" }`
- **PUT** `/api/masters/branches/:id` - Update a branch
- **DELETE** `/api/masters/branches/:id` - Delete a branch

### Employees
- ... (existing employee routes)
