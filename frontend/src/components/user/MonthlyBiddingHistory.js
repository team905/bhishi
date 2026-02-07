import React, { useState, useEffect } from 'react';
import axios from 'axios';

function MonthlyBiddingHistory({ groupId }) {
  const [groupDetails, setGroupDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (groupId) {
      fetchGroupDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  const fetchGroupDetails = async () => {
    try {
      const response = await axios.get(`/api/bhishi/groups/${groupId}`);
      setGroupDetails(response.data);
    } catch (error) {
      console.error('Failed to fetch group details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading monthly history...</div>;
  if (!groupDetails) return <div className="empty-state">Group not found</div>;

  const cycles = groupDetails.cycles || [];
  const members = groupDetails.members || [];

  // Group cycles by month (using cycle_number as month indicator)
  // Since each cycle represents a month, we'll organize by cycle number
  const cyclesByMonth = cycles.reduce((acc, cycle) => {
    // Use cycle number as the key, but also show the actual month
    const monthKey = `Cycle ${cycle.cycle_number} - ${new Date(cycle.bidding_start_date).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long' 
    })}`;
    if (!acc[monthKey]) {
      acc[monthKey] = [];
    }
    acc[monthKey].push(cycle);
    return acc;
  }, {});


  return (
    <div>
      <div className="card">
        <h2>
          <span className="icon">📅</span> Monthly Bidding History - {groupDetails.name}
        </h2>
        <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
          <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
            <div>
              <strong>Total Members:</strong> {groupDetails.total_members}
            </div>
            <div>
              <strong>Completed Cycles:</strong> {cycles.filter(c => c.status === 'closed').length} / {groupDetails.total_members}
            </div>
            <div>
              <strong>Contribution Amount:</strong> ₹{groupDetails.contribution_amount}
            </div>
            <div>
              <strong>Total Pool:</strong> ₹{groupDetails.contribution_amount * groupDetails.total_members}
            </div>
          </div>
        </div>

        {Object.keys(cyclesByMonth).length === 0 ? (
          <div className="empty-state">
            <h3>No bidding cycles yet</h3>
            <p>Bidding cycles will appear here once they are created.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {Object.entries(cyclesByMonth)
              .sort((a, b) => {
                // Extract cycle number from the key for sorting
                const cycleNumA = parseInt(a[0].match(/Cycle (\d+)/)?.[1] || '0');
                const cycleNumB = parseInt(b[0].match(/Cycle (\d+)/)?.[1] || '0');
                return cycleNumA - cycleNumB;
              })
              .map(([month, monthCycles]) => (
                <MonthlyCycleCard
                  key={month}
                  month={month}
                  cycles={monthCycles}
                  groupId={groupId}
                  members={members}
                  contributionAmount={groupDetails.contribution_amount}
                />
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MonthlyCycleCard({ month, cycles, groupId, members, contributionAmount }) {
  const [paymentStatuses, setPaymentStatuses] = useState({});
  const [loadingPayments, setLoadingPayments] = useState(true);

  useEffect(() => {
    fetchAllPaymentStatuses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cycles]);

  const fetchAllPaymentStatuses = async () => {
    const statuses = {};
    for (const cycle of cycles) {
      try {
        const response = await axios.get(`/api/bhishi/groups/${groupId}/cycles/${cycle.id}/payments`);
        statuses[cycle.id] = response.data;
      } catch (error) {
        console.error(`Failed to fetch payments for cycle ${cycle.id}:`, error);
        statuses[cycle.id] = [];
      }
    }
    setPaymentStatuses(statuses);
    setLoadingPayments(false);
  };

  return (
    <div className="card" style={{ border: '2px solid #e0e0e0' }}>
      <h3 style={{ 
        color: '#2d3748', 
        borderBottom: '2px solid #e0e0e0', 
        paddingBottom: '10px',
        marginBottom: '20px'
      }}>
        <span className="icon">📆</span> {month}
      </h3>

      {cycles.map((cycle) => {
        const payments = paymentStatuses[cycle.id] || [];
        const paidMembers = payments.filter(p => p.payment_status === 'paid').length;
        const pendingMembers = payments.filter(p => p.payment_status === 'pending').length;
        const totalPool = contributionAmount * members.length;

        return (
          <div key={cycle.id} style={{ 
            marginBottom: '30px', 
            padding: '20px', 
            backgroundColor: '#fafafa',
            borderRadius: '8px',
            border: '1px solid #e0e0e0'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h4 style={{ margin: 0, color: '#2d3748' }}>
                  Cycle #{cycle.cycle_number}
                  {cycle.status === 'closed' && cycle.winner_name && (
                    <span style={{ marginLeft: '10px', fontSize: '14px', color: '#28a745' }}>
                      ✓ Winner: {cycle.winner_name}
                    </span>
                  )}
                </h4>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                  {new Date(cycle.bidding_start_date).toLocaleDateString()} - {new Date(cycle.bidding_end_date).toLocaleDateString()}
                </div>
              </div>
              <div>
                <span className={`badge ${
                  cycle.status === 'open' ? 'badge-success' :
                  cycle.status === 'closed' ? 'badge-warning' : 'badge-info'
                }`}>
                  {cycle.status}
                </span>
              </div>
            </div>

            {/* Cycle Stats */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
              gap: '15px',
              marginBottom: '20px'
            }}>
              <div style={{ padding: '10px', backgroundColor: 'white', borderRadius: '6px' }}>
                <div style={{ fontSize: '12px', color: '#666' }}>Total Pool</div>
                <div style={{ fontSize: '18px', fontWeight: '600' }}>₹{totalPool.toFixed(2)}</div>
              </div>
              {cycle.status === 'closed' && cycle.winning_bid_amount !== null && (
                <>
                  <div style={{ padding: '10px', backgroundColor: 'white', borderRadius: '6px' }}>
                    <div style={{ fontSize: '12px', color: '#666' }}>Winning Bid</div>
                    <div style={{ fontSize: '18px', fontWeight: '600', color: '#28a745' }}>
                      ₹{cycle.winning_bid_amount.toFixed(2)}
                    </div>
                  </div>
                  <div style={{ padding: '10px', backgroundColor: 'white', borderRadius: '6px' }}>
                    <div style={{ fontSize: '12px', color: '#666' }}>Profit Shared</div>
                    <div style={{ fontSize: '18px', fontWeight: '600', color: '#28a745' }}>
                      ₹{(totalPool - cycle.winning_bid_amount).toFixed(2)}
                    </div>
                  </div>
                  <div style={{ padding: '10px', backgroundColor: 'white', borderRadius: '6px' }}>
                    <div style={{ fontSize: '12px', color: '#666' }}>Per Member Profit</div>
                    <div style={{ fontSize: '18px', fontWeight: '600', color: '#28a745' }}>
                      ₹{((totalPool - cycle.winning_bid_amount) / members.length).toFixed(2)}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Payment Status Table */}
            {cycle.status === 'closed' && (
              <div style={{ marginTop: '20px' }}>
                <h4 style={{ marginBottom: '15px', fontSize: '16px', color: '#2d3748' }}>
                  <span className="icon">💳</span> Payment Status
                </h4>
                {loadingPayments ? (
                  <div className="loading">Loading payment status...</div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Member</th>
                          <th>Original Amount</th>
                          <th>Payable Amount</th>
                          <th>Earned (Profit)</th>
                          <th>Payment Status</th>
                          <th>Payment Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {members.map(member => {
                          const payment = payments.find(p => p.user_id === member.id);
                          if (!payment) {
                            return (
                              <tr key={member.id} style={{ backgroundColor: '#fff3cd' }}>
                                <td><strong>{member.full_name}</strong></td>
                                <td>₹{contributionAmount.toFixed(2)}</td>
                                <td>-</td>
                                <td>-</td>
                                <td><span className="badge badge-danger">Not Created</span></td>
                                <td>-</td>
                              </tr>
                            );
                          }

                          const payableAmount = payment.payable_amount !== null && payment.payable_amount !== undefined
                            ? payment.payable_amount
                            : payment.amount;
                          const earnedAmount = payment.amount - payableAmount;
                          const hasProfit = earnedAmount > 0;

                          return (
                            <tr 
                              key={member.id}
                              style={{ 
                                backgroundColor: payment.payment_status === 'pending' ? '#fff3cd' : '#f9f9f9'
                              }}
                            >
                              <td>
                                <strong>{member.full_name}</strong>
                                {cycle.winner_user_id === member.id && (
                                  <span className="badge badge-success" style={{ marginLeft: '8px', fontSize: '10px' }}>
                                    Winner
                                  </span>
                                )}
                              </td>
                              <td>₹{payment.amount.toFixed(2)}</td>
                              <td>
                                <strong style={{ 
                                  color: hasProfit ? '#28a745' : '#ff9800',
                                  fontSize: '14px'
                                }}>
                                  ₹{payableAmount.toFixed(2)}
                                </strong>
                                {hasProfit && (
                                  <div style={{ fontSize: '11px', color: '#28a745' }}>
                                    (Reduced)
                                  </div>
                                )}
                              </td>
                              <td>
                                {hasProfit ? (
                                  <span style={{ color: '#28a745', fontWeight: '600' }}>
                                    +₹{earnedAmount.toFixed(2)}
                                  </span>
                                ) : (
                                  <span style={{ color: '#999' }}>-</span>
                                )}
                              </td>
                              <td>
                                <span className={`badge ${
                                  payment.payment_status === 'paid' ? 'badge-success' :
                                  payment.payment_status === 'pending' ? 'badge-warning' : 'badge-danger'
                                }`}>
                                  {payment.payment_status}
                                </span>
                              </td>
                              <td>
                                {payment.payment_date
                                  ? new Date(payment.payment_date).toLocaleDateString()
                                  : '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Summary */}
                {!loadingPayments && (
                  <div style={{ 
                    marginTop: '15px', 
                    padding: '15px', 
                    backgroundColor: '#e3f2fd',
                    borderRadius: '6px',
                    display: 'flex',
                    gap: '20px',
                    flexWrap: 'wrap'
                  }}>
                    <div>
                      <strong>Paid:</strong> {paidMembers} / {members.length}
                    </div>
                    <div>
                      <strong>Pending:</strong> {pendingMembers} / {members.length}
                    </div>
                    <div style={{ color: '#dc3545', fontWeight: '600' }}>
                      {pendingMembers > 0 && `⚠️ ${pendingMembers} member(s) have not paid`}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default MonthlyBiddingHistory;

