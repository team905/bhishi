const { getDb } = require('../config/database');

// Notify users about bidding cycle
const notifyBiddingCycle = async (cycleId) => {
  const db = getDb();
  
  return new Promise((resolve, reject) => {
    // Get cycle details
    db.get(`
      SELECT 
        bc.*,
        bg.name as group_name,
        bg.id as group_id
      FROM bidding_cycles bc
      INNER JOIN bhishi_groups bg ON bc.group_id = bg.id
      WHERE bc.id = ?
    `, [cycleId], (err, cycle) => {
      if (err) {
        console.error('Error fetching cycle:', err);
        return reject(err);
      }
      if (!cycle) {
        return reject(new Error('Cycle not found'));
      }

      // Get all group members with their contact info
      db.all(`
        SELECT gm.user_id, u.phone, u.email, u.full_name
        FROM group_members gm
        INNER JOIN users u ON gm.user_id = u.id
        WHERE gm.group_id = ?
      `, [cycle.group_id], (err, members) => {
        if (err) {
          console.error('Error fetching group members:', err);
          return reject(err);
        }

        // Format dates
        const biddingDate = new Date(cycle.bidding_start_date).toLocaleDateString();
        const biddingTime = new Date(cycle.bidding_start_date).toLocaleTimeString();
        const biddingEndTime = new Date(cycle.bidding_end_date).toLocaleTimeString();

        // Create dashboard notifications for each member
        const title = `New Bidding Cycle - ${cycle.group_name}`;
        const message = `Bidding for ₹${cycle.total_pool_amount} starts on ${biddingDate} at ${biddingTime}. Ends at ${biddingEndTime}`;
        const stmt = db.prepare('INSERT INTO notifications (user_id, cycle_id, type, title, message) VALUES (?, ?, ?, ?, ?)');
        members.forEach(member => {
          stmt.run([member.user_id, cycleId, 'bidding_cycle', title, message]);
        });
        stmt.finalize((err) => {
          if (err) {
            console.error('Error creating notifications:', err);
            return reject(err);
          }

          // Send WhatsApp notifications (placeholder)
          members.forEach(member => {
            if (member.phone) {
              sendWhatsAppNotification(member.phone, {
                type: 'bidding_cycle',
                groupName: cycle.group_name,
                amount: cycle.total_pool_amount,
                startDate: biddingDate,
                startTime: biddingTime,
                endTime: biddingEndTime
              });
            }
          });

          // Send email notifications (placeholder)
          sendEmailNotification(members.map(m => m.user_id), {
            subject: `New Bidding Cycle - ${cycle.group_name}`,
            body: `A new bidding cycle has been scheduled.\n\nGroup: ${cycle.group_name}\nAmount: ₹${cycle.total_pool_amount}\nStart: ${biddingDate} at ${biddingTime}\nEnd: ${biddingEndTime}\n\nPlease log in to place your bid.`
          });

          // Send push notifications (placeholder)
          sendPushNotification(members.map(m => m.user_id), {
            title: 'New Bidding Cycle',
            body: `Bidding for ₹${cycle.total_pool_amount} starts on ${biddingDate} at ${biddingTime}`
          });

          resolve({ notified: members.length });
        });
      });
    });
  });
};

// Send winner notification
const sendWinnerNotification = async (winnerUserId, cycleId, payoutAmount, isRandomWinner) => {
  const db = getDb();
  
  return new Promise((resolve, reject) => {
    // Get winner details with group info from cycle
    db.get(`
      SELECT u.id, u.phone, u.email, u.full_name, bg.name as group_name, bg.id as group_id, bc.cycle_number
      FROM users u
      INNER JOIN bidding_cycles bc ON bc.id = ?
      INNER JOIN bhishi_groups bg ON bg.id = bc.group_id
      WHERE u.id = ?
    `, [cycleId, winnerUserId], (err, winner) => {
      if (err || !winner) {
        console.error('Error fetching winner:', err);
        return reject(err || new Error('Winner not found'));
      }

      // Create dashboard notification for winner
      const title = `🎉 You Won! - ${winner.group_name}`;
      const message = isRandomWinner 
        ? `Congratulations! You won the bidding cycle #${winner.cycle_number} for ${winner.group_name} (Random selection - no bids). You will receive ₹${payoutAmount.toFixed(2)}. Please complete agreement signing and video verification.`
        : `Congratulations! You won the bidding cycle #${winner.cycle_number} for ${winner.group_name}! You will receive ₹${payoutAmount.toFixed(2)}. Please complete agreement signing and video verification.`;
      
      db.run('INSERT INTO notifications (user_id, cycle_id, type, title, message) VALUES (?, ?, ?, ?, ?)',
        [winnerUserId, cycleId, 'winner', title, message], (err) => {
          if (err) {
            console.error('Error creating winner notification:', err);
          }
        });

      // Send WhatsApp notification to winner
      if (winner.phone) {
        sendWhatsAppNotification(winner.phone, {
          type: 'winner',
          groupName: winner.group_name,
          payoutAmount: payoutAmount,
          cycleNumber: winner.cycle_number
        });
      }

      // Send email to winner
      sendEmailNotification([winner.id], {
        subject: `You Won! - ${winner.group_name} Cycle #${winner.cycle_number}`,
        body: message
      });

      // Send push notification to winner
      sendPushNotification([winner.id], {
        title: '🎉 You Won!',
        body: `You won ₹${payoutAmount.toFixed(2)} for ${winner.group_name}`
      });

      resolve({ notified: true });
    });
  });
};

// Send payment notifications after profit calculation
const sendPaymentNotifications = async (groupId, cycleId, payableAmount, earnedAmount) => {
  const db = getDb();
  
  return new Promise((resolve, reject) => {
    // Get all group members with their contact info
    db.all(`
      SELECT gm.user_id, u.phone, u.email, u.full_name, bg.name as group_name
      FROM group_members gm
      INNER JOIN users u ON gm.user_id = u.id
      INNER JOIN bhishi_groups bg ON gm.group_id = bg.id
      WHERE gm.group_id = ?
    `, [groupId], (err, members) => {
      if (err) {
        console.error('Error fetching members for notifications:', err);
        return reject(err);
      }

    // Create dashboard notifications
    const title = `Payment Due - ${members[0]?.group_name || 'Bhishi Group'}`;
    const stmt = db.prepare('INSERT INTO notifications (user_id, cycle_id, type, title, message) VALUES (?, ?, ?, ?, ?)');
    members.forEach(member => {
      let message;
      if (earnedAmount > 0) {
        message = `Payment due: ₹${payableAmount.toFixed(2)}. You earned ₹${earnedAmount.toFixed(2)} as profit share.`;
      } else {
        message = `Payment due: ₹${payableAmount.toFixed(2)} (No bids placed - full amount).`;
      }
      stmt.run([member.user_id, cycleId, 'payment_due', title, message]);
    });
    stmt.finalize();

    // Send WhatsApp notifications (placeholder)
    members.forEach(member => {
      if (member.phone) {
        sendWhatsAppNotification(member.phone, {
          type: 'payment_due',
          groupName: member.group_name,
          payableAmount: payableAmount,
          earnedAmount: earnedAmount
        });
      }
    });

    // Send email notifications
    sendEmailNotification(members.map(m => m.user_id), {
      subject: `Payment Due - ${members[0]?.group_name || 'Bhishi Group'}`,
      body: earnedAmount > 0 
        ? `Your payment of ₹${payableAmount.toFixed(2)} is due. You earned ₹${earnedAmount.toFixed(2)} as profit share.`
        : `Your payment of ₹${payableAmount.toFixed(2)} is due (No bids were placed).`
    });

    // Send push notifications
    sendPushNotification(members.map(m => m.user_id), {
      title: 'Payment Due',
      body: earnedAmount > 0 
        ? `Pay ₹${payableAmount.toFixed(2)}. You earned ₹${earnedAmount.toFixed(2)}!`
        : `Pay ₹${payableAmount.toFixed(2)}`
      });
      
      resolve({ notified: members.length });
    });
  });
};

// Send WhatsApp notification (placeholder)
const sendWhatsAppNotification = async (phone, data) => {
  // TODO: Implement WhatsApp API integration
  // Example: Twilio WhatsApp API, WhatsApp Business API, etc.
  let message = '';
  
  if (data.type === 'bidding_cycle') {
    message = `🎯 New Bidding Cycle!\n\nGroup: ${data.groupName}\nAmount: ₹${data.amount}\nStart: ${data.startDate} at ${data.startTime}\nEnd: ${data.endTime}\n\nPlease log in to place your bid.`;
  } else if (data.type === 'winner') {
    message = `🎉 Congratulations! You won the bidding for ${data.groupName}!\n\nYou will receive: ₹${data.payoutAmount.toFixed(2)}\n\nPlease complete agreement signing and video verification to receive the payout.`;
  } else if (data.type === 'payment_due') {
    message = `💰 Payment Due\n\nGroup: ${data.groupName}\nAmount: ₹${data.payableAmount.toFixed(2)}${data.earnedAmount > 0 ? `\nYou earned: ₹${data.earnedAmount.toFixed(2)} as profit share` : ''}\n\nPlease make the payment.`;
  } else {
    message = `Hi! Your payment of ₹${data.payableAmount.toFixed(2)} is due for ${data.groupName}. ${data.earnedAmount > 0 ? `You earned ₹${data.earnedAmount.toFixed(2)} as profit share.` : ''}`;
  }
  
  console.log('WhatsApp notification to', phone, ':', { message });
};

// Send email notification (placeholder)
const sendEmailNotification = async (userIds, notification) => {
  // TODO: Implement email sending logic (Nodemailer, SendGrid, etc.)
  console.log('Email notification:', userIds, notification);
};

// Send push notification (placeholder)
const sendPushNotification = async (userIds, notification) => {
  // TODO: Implement push notification logic (Firebase Cloud Messaging, OneSignal, etc.)
  console.log('Push notification:', userIds, notification);
};

module.exports = {
  notifyBiddingCycle,
  sendWinnerNotification,
  sendPaymentNotifications,
  sendWhatsAppNotification,
  sendEmailNotification,
  sendPushNotification
};
