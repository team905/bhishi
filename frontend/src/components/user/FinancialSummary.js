import React from 'react';

function FinancialSummary({ financialSummary, winnings, profitDistributions }) {
  console.log('FinancialSummary component received:', { financialSummary, winnings, profitDistributions });
  
  if (!financialSummary) {
    return (
      <div className="card">
        <h2><span className="icon">📊</span> Financial Summary</h2>
        <p style={{ color: '#999', padding: '20px' }}>No financial data available yet.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2><span className="icon">📊</span> Financial Summary</h2>
      
      <div className="financial-stats">
        <div className="financial-item">
          <div className="financial-label">Total Contributed</div>
          <div className="financial-value negative">₹{(financialSummary.totalContributions || 0).toFixed(2)}</div>
        </div>
        
        <div className="financial-item">
          <div className="financial-label">Total Earned (Profit Distributions)</div>
          <div className="financial-value positive">₹{(financialSummary.totalEarnings || 0).toFixed(2)}</div>
        </div>
        
        <div className="financial-item">
          <div className="financial-label">Total Winnings (Bhishi Payouts)</div>
          <div className="financial-value positive">₹{(financialSummary.totalWinnings || 0).toFixed(2)}</div>
        </div>
        
        <div className="financial-item highlight">
          <div className="financial-label">Net Amount</div>
          <div className={`financial-value ${(financialSummary.netAmount || 0) >= 0 ? 'positive' : 'negative'}`}>
            ₹{(financialSummary.netAmount || 0).toFixed(2)}
          </div>
          <div className="financial-note">
            {(financialSummary.netAmount || 0) >= 0 ? 'Profit' : 'Loss'}
          </div>
        </div>
      </div>

      <div className="win-status-section">
        <h3>Win Status</h3>
        {financialSummary.hasWon ? (
          <div className="win-status won">
            <span className="badge badge-success">✓ Won Before</span>
            <p>You have won the bhishi in {financialSummary.groupsWon.length} group(s)</p>
          </div>
        ) : (
          <div className="win-status not-won">
            <span className="badge badge-warning">Not Won Yet</span>
            <p>You have not won any bhishi cycles yet</p>
          </div>
        )}
      </div>

      {winnings && winnings.length > 0 && (
        <div className="winnings-section">
          <h3><span className="icon">🏆</span> Your Winnings</h3>
          <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Group</th>
                <th>Cycle #</th>
                <th>Payout Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {winnings.map(win => (
                <tr key={win.cycle_id}>
                  <td>{win.group_name}</td>
                  <td>{win.cycle_number}</td>
                  <td>₹{win.payout_amount.toFixed(2)}</td>
                  <td>
                    <span className={`badge ${win.admin_approved ? 'badge-success' : 'badge-warning'}`}>
                      {win.admin_approved ? 'Paid' : 'Pending'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {profitDistributions && profitDistributions.length > 0 && (
        <div className="earnings-section">
          <h3><span className="icon">💰</span> Profit Distributions Received</h3>
          <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Group</th>
                <th>Cycle #</th>
                <th>Profit Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {profitDistributions.map(profit => (
                <tr key={profit.id}>
                  <td>{profit.group_name}</td>
                  <td>{profit.cycle_number}</td>
                  <td>₹{profit.profit_amount.toFixed(2)}</td>
                  <td>
                    <span className={`badge ${
                      profit.distribution_status === 'distributed' ? 'badge-success' : 'badge-warning'
                    }`}>
                      {profit.distribution_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default FinancialSummary;

