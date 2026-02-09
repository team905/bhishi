const { db } = require('../config/database');
const admin = require('firebase-admin');

// Notify users about bidding cycle
const notifyBiddingCycle = async (cycleId) => {
  try {
    // Get cycle details
    const cycle = await db.getById('bidding_cycles', cycleId);
    if (!cycle) {
      throw new Error('Cycle not found');
    }

    const group = await db.getById('bhishi_groups', cycle.group_id);
    if (!group) {
      throw new Error('Group not found');
    }

    // Get all group members with their contact info
    const members = await db.getAll('group_members', [
      { field: 'group_id', operator: '==', value: cycle.group_id }
    ]);

    // Get user details for each member
    const membersWithDetails = await Promise.all(members.map(async (member) => {
      const user = await db.getById('users', member.user_id);
      return {
        user_id: member.user_id,
        phone: user ? user.phone : null,
        email: user ? user.email : null,
        full_name: user ? user.full_name : null
      };
    }));

    // Format dates
    const biddingDate = new Date(cycle.bidding_start_date).toLocaleDateString();
    const biddingTime = new Date(cycle.bidding_start_date).toLocaleTimeString();
    const biddingEndTime = new Date(cycle.bidding_end_date).toLocaleTimeString();

    // Create dashboard notifications for each member
    const title = `New Bidding Cycle - ${group.name}`;
    const message = `Bidding for ₹${cycle.total_pool_amount} starts on ${biddingDate} at ${biddingTime}. Ends at ${biddingEndTime}`;

    const firestore = require('../config/database').getFirestore();
    const batch = firestore.batch();

    membersWithDetails.forEach(member => {
      const notificationRef = firestore.collection('notifications').doc();
      batch.set(notificationRef, {
        user_id: member.user_id,
        cycle_id: cycleId,
        type: 'bidding_cycle',
        title,
        message,
        is_read: false,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    await batch.commit();

    // Send WhatsApp notifications (placeholder)
    membersWithDetails.forEach(member => {
      if (member.phone) {
        sendWhatsAppNotification(member.phone, {
          type: 'bidding_cycle',
          groupName: group.name,
          amount: cycle.total_pool_amount,
          startDate: biddingDate,
          startTime: biddingTime,
          endTime: biddingEndTime
        });
      }
    });

    // Send email notifications (placeholder)
    sendEmailNotification(membersWithDetails.map(m => m.user_id), {
      subject: `New Bidding Cycle - ${group.name}`,
      body: `A new bidding cycle has been scheduled.\n\nGroup: ${group.name}\nAmount: ₹${cycle.total_pool_amount}\nStart: ${biddingDate} at ${biddingTime}\nEnd: ${biddingEndTime}\n\nPlease log in to place your bid.`
    });

    // Send push notifications (placeholder)
    sendPushNotification(membersWithDetails.map(m => m.user_id), {
      title: 'New Bidding Cycle',
      body: `Bidding for ₹${cycle.total_pool_amount} starts on ${biddingDate} at ${biddingTime}`
    });

    return { notified: membersWithDetails.length };
  } catch (error) {
    console.error('Error in notifyBiddingCycle:', error);
    throw error;
  }
};

// Send winner notification
const sendWinnerNotification = async (winnerUserId, cycleId, payoutAmount, isRandomWinner) => {
  try {
    // Get winner details with group info from cycle
    const cycle = await db.getById('bidding_cycles', cycleId);
    if (!cycle) {
      throw new Error('Cycle not found');
    }

    const group = await db.getById('bhishi_groups', cycle.group_id);
    if (!group) {
      throw new Error('Group not found');
    }

    const winner = await db.getById('users', winnerUserId);
    if (!winner) {
      throw new Error('Winner not found');
    }

    // Create dashboard notification for winner
    const title = `🎉 You Won! - ${group.name}`;
    const message = isRandomWinner 
      ? `Congratulations! You won the bidding cycle #${cycle.cycle_number} for ${group.name} (Random selection - no bids). You will receive ₹${payoutAmount.toFixed(2)}. Please complete agreement signing and video verification.`
      : `Congratulations! You won the bidding cycle #${cycle.cycle_number} for ${group.name}! You will receive ₹${payoutAmount.toFixed(2)}. Please complete agreement signing and video verification.`;
    
    await db.create('notifications', {
      user_id: winnerUserId,
      cycle_id: cycleId,
      type: 'winner',
      title,
      message,
      is_read: false,
    });

    // Send WhatsApp notification to winner
    if (winner.phone) {
      sendWhatsAppNotification(winner.phone, {
        type: 'winner',
        groupName: group.name,
        payoutAmount: payoutAmount,
        cycleNumber: cycle.cycle_number
      });
    }

    // Send email to winner
    sendEmailNotification([winner.id], {
      subject: `You Won! - ${group.name} Cycle #${cycle.cycle_number}`,
      body: message
    });

    // Send push notification to winner
    sendPushNotification([winner.id], {
      title: '🎉 You Won!',
      body: `You won ₹${payoutAmount.toFixed(2)} for ${group.name}`
    });

    return { notified: true };
  } catch (error) {
    console.error('Error in sendWinnerNotification:', error);
    throw error;
  }
};

// Send payment notifications after profit calculation
const sendPaymentNotifications = async (groupId, cycleId, payableAmount, earnedAmount) => {
  try {
    // Get all group members with their contact info
    const members = await db.getAll('group_members', [
      { field: 'group_id', operator: '==', value: groupId }
    ]);

    const group = await db.getById('bhishi_groups', groupId);
    if (!group) {
      throw new Error('Group not found');
    }

    // Get user details for each member
    const membersWithDetails = await Promise.all(members.map(async (member) => {
      const user = await db.getById('users', member.user_id);
      return {
        user_id: member.user_id,
        phone: user ? user.phone : null,
        email: user ? user.email : null,
        full_name: user ? user.full_name : null,
        group_name: group.name
      };
    }));

    // Create dashboard notifications
    const title = `Payment Due - ${group.name}`;
    const firestore = require('../config/database').getFirestore();
    const batch = firestore.batch();

    membersWithDetails.forEach(member => {
      let message;
      if (earnedAmount > 0) {
        message = `Payment due: ₹${payableAmount.toFixed(2)}. You earned ₹${earnedAmount.toFixed(2)} as profit share.`;
      } else {
        message = `Payment due: ₹${payableAmount.toFixed(2)} (No bids placed - full amount).`;
      }

      const notificationRef = firestore.collection('notifications').doc();
      batch.set(notificationRef, {
        user_id: member.user_id,
        cycle_id: cycleId,
        type: 'payment_due',
        title,
        message,
        is_read: false,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    await batch.commit();

    // Send WhatsApp notifications (placeholder)
    membersWithDetails.forEach(member => {
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
    sendEmailNotification(membersWithDetails.map(m => m.user_id), {
      subject: `Payment Due - ${group.name}`,
      body: earnedAmount > 0 
        ? `Your payment of ₹${payableAmount.toFixed(2)} is due. You earned ₹${earnedAmount.toFixed(2)} as profit share.`
        : `Your payment of ₹${payableAmount.toFixed(2)} is due (No bids were placed).`
    });

    // Send push notifications
    sendPushNotification(membersWithDetails.map(m => m.user_id), {
      title: 'Payment Due',
      body: earnedAmount > 0 
        ? `Pay ₹${payableAmount.toFixed(2)}. You earned ₹${earnedAmount.toFixed(2)}!`
        : `Pay ₹${payableAmount.toFixed(2)}`
    });
      
    return { notified: membersWithDetails.length };
  } catch (error) {
    console.error('Error in sendPaymentNotifications:', error);
    throw error;
  }
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
