import React from 'react';

function Modal({ children, onClose }) {
  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose} style={{ float: 'right', marginBottom: '10px' }}>&times;</button>
        {children}
      </div>
    </div>
  );
}

export default Modal;

