import React from 'react';
import { useNavigate } from 'react-router-dom';

function ContributionsSection({ contributions, onVerificationClick }) {
  const navigate = useNavigate();

  if (contributions.length === 0) {
    return (
      <div className="empty-state">
        <h3>No contributions found</h3>
        <p>You have not made any contributions yet.</p>
      </div>
    );
  }

  // Calculate summary
  const pendingContributions = contributions.filter(c => c.payment_status === 'pending');
  const totalAmountDue = pendingContributions.reduce((sum, c) => {
    const payableAmount = c.payable_amount !== null && c.payable_amount !== undefined 
      ? c.payable_amount 
      : c.amount;
    return sum + parseFloat(payableAmount || 0);
  }, 0);

  const closedCycles = contributions.filter(c => c.cycle_status === 'closed');
  const closedWithPayable = closedCycles.filter(c => {
    const payableAmount = c.payable_amount !== null && c.payable_amount !== undefined 
      ? c.payable_amount 
      : c.amount;
    return payableAmount !== c.amount; // Has been calculated (reduced)
  });

  return (
    <div>
      {totalAmountDue > 0 && (
        <div className="card" style={{ 
          marginBottom: '20px', 
          border: '2px solid #ff9800',
          backgroundColor: '#fff9e6'
        }}>
          <h2 style={{ color: '#ff9800', marginBottom: '15px' }}>
            <span className="icon">⚠️</span> Payment Due Summary
          </h2>
          <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>Total Amount Due</div>
              <div style={{ fontSize: '32px', fontWeight: '700', color: '#ff9800' }}>
                ₹{totalAmountDue.toFixed(2)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>Pending Payments</div>
              <div style={{ fontSize: '24px', fontWeight: '600', color: '#333' }}>
                {pendingContributions.length}
              </div>
            </div>
            {closedWithPayable.length > 0 && (
              <div>
                <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>Cycles with Profit</div>
                <div style={{ fontSize: '24px', fontWeight: '600', color: '#28a745' }}>
                  {closedWithPayable.length}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="card">
        <h2><span className="icon">💳</span> My Contributions</h2>
        <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>Group</th>
              <th>Cycle #</th>
              <th>Original Amount</th>
              <th>Payable Amount</th>
              <th>Earned (Profit)</th>
              <th>Payment Status</th>
              <th>Payment Date</th>
              <th>Cycle Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {contributions.map(contribution => {
              const payableAmount = contribution.payable_amount !== null && contribution.payable_amount !== undefined 
                ? contribution.payable_amount 
                : contribution.amount;
              const earnedAmount = contribution.amount - payableAmount;
              const hasProfit = earnedAmount > 0;

              return (
                <tr key={contribution.id}>
                  <td><strong>{contribution.group_name}</strong></td>
                  <td>{contribution.cycle_number}</td>
                  <td>₹{contribution.amount.toFixed(2)}</td>
                  <td>
                    <div style={{ 
                      padding: '8px 12px', 
                      backgroundColor: contribution.cycle_status === 'closed' ? (hasProfit ? '#e8f5e9' : '#fff3e0') : '#f5f5f5',
                      borderRadius: '6px',
                      border: contribution.cycle_status === 'closed' ? `2px solid ${hasProfit ? '#28a745' : '#ff9800'}` : '1px solid #ddd'
                    }}>
                      <strong style={{ 
                        color: contribution.cycle_status === 'closed' ? (hasProfit ? '#28a745' : '#ff9800') : '#333',
                        fontSize: contribution.cycle_status === 'closed' ? '18px' : '14px',
                        fontWeight: '700'
                      }}>
                        ₹{payableAmount.toFixed(2)}
                      </strong>
                      {contribution.cycle_status === 'closed' && (
                        <div style={{ 
                          fontSize: '12px', 
                          color: hasProfit ? '#28a745' : '#ff9800',
                          fontWeight: '600',
                          marginTop: '4px'
                        }}>
                          {hasProfit ? '✓ Reduced (Profit Applied)' : '⚠ Full Amount (No Bids)'}
                        </div>
                      )}
                      {contribution.cycle_status === 'open' && (
                        <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                          (Will be calculated after bidding)
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    {hasProfit ? (
                      <span style={{ color: '#28a745', fontWeight: '600', fontSize: '14px' }}>
                        +₹{earnedAmount.toFixed(2)}
                      </span>
                    ) : contribution.cycle_status === 'closed' ? (
                      <span style={{ color: '#999', fontSize: '12px' }}>No profit</span>
                    ) : (
                      <span style={{ color: '#999' }}>-</span>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${
                      contribution.payment_status === 'paid' ? 'badge-success' :
                      contribution.payment_status === 'pending' ? 'badge-warning' : 'badge-danger'
                    }`}>
                      {contribution.payment_status}
                    </span>
                  </td>
                  <td>
                    {contribution.payment_date
                      ? new Date(contribution.payment_date).toLocaleDateString()
                      : '-'}
                  </td>
                  <td>
                    <span className={`badge ${
                      contribution.cycle_status === 'open' ? 'badge-success' :
                      contribution.cycle_status === 'closed' ? 'badge-warning' : 'badge-info'
                    }`}>
                      {contribution.cycle_status}
                    </span>
                  </td>
                  <td>
                    {contribution.is_winner === 1 && contribution.cycle_status === 'closed' && (
                      <button
                        className="btn btn-primary"
                        style={{ padding: '5px 10px', fontSize: '12px' }}
                        onClick={() => {
                          if (onVerificationClick) {
                            onVerificationClick(contribution.cycle_id);
                          } else {
                            navigate(`/verification/${contribution.cycle_id}`);
                          }
                        }}
                      >
                        Complete Verification
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
        </div>
      </div>
    </div>
  );
}

export default ContributionsSection;
