# Walking Tracker Application

## Overview
This is a Walking Tracker application built using the MERN stack (MongoDB, Express, React, Node.js). The backend is responsible for handling user data, authentication, and storing walking data.

## Project Structure
```
backend
├── models
│   └── user.js
├── routes
│   └── index.js
├── middleware
│   └── auth.js
├── config
│   └── database.js
├── server.js
├── package.json
└── README.md
```

## Setup Instructions

1. **Clone the repository**
   ```
   git clone <repository-url>
   cd backend
   ```

2. **Install dependencies**
   ```
   npm install
   ```

3. **Configure the database**
   - Update the database connection string in `config/database.js` with your MongoDB URI.

4. **Run the server**
   ```
   npm start
   ```

## API Endpoints

### User Routes
- **POST /api/users/register**: Register a new user.
- **POST /api/users/login**: Login an existing user.
- **GET /api/users/profile**: Get user profile (protected route).

## Usage Guidelines
- Ensure MongoDB is running before starting the server.
- Use Postman or similar tools to test the API endpoints.
- For protected routes, include the JWT token in the Authorization header.

## License
This project is licensed under the MIT License.