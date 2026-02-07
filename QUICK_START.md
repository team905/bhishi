# Quick Start Guide

## First Time Setup

1. **Install Dependencies**
   ```bash
   npm run install-all
   ```

2. **Set Up Environment**
   - Create `backend/.env` file:
     ```
     PORT=5005
     JWT_SECRET=your-secret-key-change-in-production
     NODE_ENV=development
     ```

3. **Start Development Servers**
   ```bash
   npm run dev
   ```
   
   This starts:
   - Backend on http://localhost:5005
   - Frontend on http://localhost:3000

4. **Login as Admin**
   - Open http://localhost:3000
   - Username: `admin`
   - Password: `admin123`

## Basic Workflow

### Admin Workflow

1. **Create Users**
   - Go to Admin Dashboard → Users tab
   - Click "Create User"
   - Fill in details and set password
   - Share credentials with users

2. **Create a Bhishi Group**
   - Go to Groups tab
   - Click "Create Group"
   - Enter:
     - Group name and description
     - Contribution amount (e.g., ₹5005)
     - Total members (e.g., 10)
     - Cycle duration (e.g., 30 days)

3. **Add Members to Group**
   - Find the group in the list
   - Click "Add Member"
   - Select a user from dropdown
   - Repeat until group is full

4. **Start a Bidding Cycle**
   - Go to Bidding Cycles tab
   - Click "Create Bidding Cycle"
   - Select a group
   - Set bidding start and end dates/times
   - Members can now place bids

5. **Close Bidding & Approve Payout**
   - After bidding period ends, click "Close"
   - System determines winner (lowest bid)
   - Review winner details
   - Click "Approve Payout"

### User Workflow

1. **Login** with credentials provided by admin

2. **View Dashboard**
   - See active bidding cycles
   - View your groups
   - Check contribution status

3. **Place a Bid**
   - Click "Place Bid" on an active cycle
   - Enter your bid amount (lower is better)
   - Submit bid
   - You can update your bid before the deadline

4. **View Bids**
   - Click "View All Bids" to see all bids
   - Lowest bid is highlighted in green

## Important Notes

- **Bidding System**: Lowest bid wins the pool
- **Winner Receives**: Total Pool - Winning Bid Amount
- **Members Contribute**: Fixed contribution amount each cycle
- **One Winner Per Cycle**: Each member wins once per group

## Troubleshooting

- **Port conflicts**: Change PORT in backend/.env
- **Database errors**: Delete `backend/data/bhishi.db` and restart (will recreate)
- **Login issues**: Check JWT_SECRET in backend/.env matches

## Need Help?

Check the main README.md for detailed documentation.

