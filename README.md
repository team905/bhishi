# Bhishi Management System

A comprehensive Chit Fund (Bhishi) Management System with bidding, profit distribution, and user management features.

## 📚 Quick Links

- **[🚀 Quick Start Guide](QUICK_START.md)** - Daily development startup (local & production)
- **[🚀 Deployment Guide](DEPLOY_CHANGES.md)** - How to deploy changes to production
- **[🔧 CI/CD Setup](CI_CD_SETUP.md)** - Set up automatic deployments
- **[📖 Complete Deployment Guide](DEPLOYMENT_GUIDE.md)** - Full setup from scratch

## 🚀 Quick Start

### Local Development
See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Part 1: Local Development Setup

### Production Deployment
See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Part 2: Production Deployment

---

## 📚 Documentation

- **Complete Deployment Guide**: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Everything you need for local and production setup

A comprehensive web application for managing Bhishi (Chit Fund) groups where members contribute fixed amounts periodically, and winners are selected through a bidding process.

## Features

### Admin Features
- **User Management**: Create and manage users with login credentials
- **Group Management**: Create and manage Bhishi groups
- **Bidding Control**: Set bidding dates and times for cycles
- **Payout Approval**: Approve winner payouts after bidding closes
- **Dispute Resolution**: View and resolve user disputes

### User Features
- **Dashboard**: View overview of groups, active bidding, and contributions
- **Bidding**: Participate in bidding cycles by placing bids
- **Group View**: See all groups you're a member of
- **Contributions**: Track your contribution history and payment status

## Technology Stack

### Backend
- Node.js with Express.js
- Firestore Database (Firebase)
- JWT Authentication
- bcryptjs for password hashing

### Frontend
- React.js
- React Router for navigation
- Axios for API calls
- Modern CSS with responsive design

## Installation

### Prerequisites
- Node.js (v14 or higher)
- npm (Node Package Manager)

### Setup Steps

1. **Clone or navigate to the project directory**
   ```bash
   cd bhishi
   ```

2. **Install all dependencies**
   ```bash
   npm run install-all
   ```
   
   Or install separately:
   ```bash
   # Install root dependencies
   npm install
   
   # Install backend dependencies
   cd backend
   npm install
   
   # Install frontend dependencies
   cd ../frontend
   npm install
   ```

3. **Set up local development**
   
   See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for complete local setup instructions.
   
   Quick start:
   - Install Firebase CLI: `npm install -g firebase-tools`
   - Initialize emulator: `firebase init emulators`
   - Start emulator: `firebase emulators:start --only firestore`
   - Create `backend/.env` with Firestore emulator config

4. **Start the development servers**
   
   From the root directory:
   ```bash
   npm run dev
   ```
   
   This will start both the backend (port 5005) and frontend (port 3000) servers.
   
   Or start them separately:
   ```bash
   # Terminal 1 - Backend
   cd backend
   npm run dev
   
   # Terminal 2 - Frontend
   cd frontend
   npm start
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5005

## Default Login Credentials

**Admin Account:**
- Username: `admin`
- Password: `admin123`

⚠️ **Important**: Change the default admin password after first login in a production environment!

## Project Structure

```
bhishi/
├── backend/
│   ├── config/
│   │   └── database.js          # Database configuration and initialization
│   ├── middleware/
│   │   └── auth.js              # Authentication middleware
│   ├── routes/
│   │   ├── admin.js             # Admin routes
│   │   ├── auth.js              # Authentication routes
│   │   ├── bidding.js           # Bidding routes
│   │   ├── bhishi.js            # Bhishi group routes
│   │   ├── disputes.js          # Dispute routes
│   │   └── users.js             # User routes
│   ├── data/                    # SQLite database storage
│   └── server.js                # Main server file
│
├── frontend/
│   ├── public/
│   └── src/
│       ├── components/
│       │   ├── admin/           # Admin components
│       │   ├── user/            # User components
│       │   ├── Login.js         # Login component
│       │   ├── Modal.js         # Modal component
│       │   └── Navbar.js        # Navigation bar
│       ├── contexts/
│       │   └── AuthContext.js   # Authentication context
│       ├── App.js               # Main app component
│       └── index.js             # Entry point
│
└── package.json                 # Root package.json
```

## Usage Guide

### For Administrators

1. **Login** with admin credentials
2. **Create Users**: Go to Users tab → Create User → Fill details and set password
3. **Create Groups**: Go to Groups tab → Create Group → Set contribution amount and member limit
4. **Add Members**: Select a group → Add Member → Choose user from dropdown
5. **Create Bidding Cycle**: Go to Bidding Cycles → Create Bidding Cycle → Select group and set dates
6. **Close Bidding**: When bidding period ends → Click "Close" → System determines winner (lowest bid)
7. **Approve Payout**: Review winner → Click "Approve Payout" → Mark cycle as approved

### For Users

1. **Login** with credentials provided by admin
2. **View Dashboard**: See active bidding cycles and your groups
3. **Place Bids**: Click "Place Bid" on active cycles → Enter bid amount → Submit
4. **View Groups**: See all groups you're a member of
5. **Track Contributions**: View your contribution history and payment status

## Bidding System

- Users place bids during the bidding period
- The **lowest bid wins** the pool
- Winner receives: Total Pool Amount - Winning Bid Amount
- Other members contribute the fixed amount
- Winner contributes: Fixed Amount - (Total Pool - Winning Bid) / (Members - 1)

## Database Schema

The system uses Firestore (Firebase) with the following collections:
- `users` - User accounts and authentication
- `bhishi_groups` - Group information
- `group_members` - Group membership
- `bidding_cycles` - Bidding cycle details
- `bids` - Individual bids placed by users
- `contributions` - Member contributions per cycle
- `disputes` - User disputes and resolutions
- `notifications` - User notifications
- `agreements` - Signed agreements
- `video_verifications` - Video verification records
- `profit_distributions` - Profit distribution records

**Local Development**: Uses Firebase Emulator (no account needed)
**Production**: Uses Firebase Cloud Firestore

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Admin Routes (`/api/admin/*`)
- User management (CRUD operations)
- Group management (CRUD operations)
- Member management
- Bidding cycle creation
- Payout approval
- Dispute resolution

### User Routes (`/api/users/*`)
- Get user dashboard data
- Get user groups

### Bidding Routes (`/api/bidding/*`)
- Get active bidding cycles
- Place/update bids
- View bids for a cycle
- Close bidding cycle (admin only)

### Disputes Routes (`/api/disputes/*`)
- Create dispute (users)
- Get user disputes
- Resolve dispute (admin)

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control (Admin/User)
- Input validation on all forms
- SQL injection protection via parameterized queries

## Future Enhancements

- Email notifications for bidding cycles
- Payment integration
- Advanced reporting and analytics
- Mobile app support
- Automated cycle creation
- Reminder notifications

## Troubleshooting

### Database Issues
- **Local**: Ensure Firestore emulator is running
- **Production**: Check Firestore security rules and service account permissions
- See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for detailed troubleshooting

### Port Already in Use
- Change PORT in backend `.env` file
- Update proxy in `frontend/package.json` if needed

### Authentication Errors
- Clear browser localStorage
- Check JWT_SECRET in backend `.env`
- Verify token expiration settings

## License

This project is open source and available for use.

## Support

For issues or questions, please check the codebase or create an issue in the repository.

