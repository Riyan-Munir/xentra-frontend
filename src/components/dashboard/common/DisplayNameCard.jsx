import React, { memo } from 'react';

const DisplayNameCard = ({ fields, setField, role, isSubmitting }) => {
    const label = role === 'freelancer' ? 'Freelancer Display Name'
        : role === 'server_admin' ? 'Admin Display Name'
            : 'Client Display Name';

    const placeholder = role === 'freelancer' ? 'e.g. Shadow Hunter'
        : role === 'server_admin' ? 'e.g. Server Owner'
            : 'e.g. Acme Corp';

    const helper = role === 'freelancer' ? 'Your public name in the marketplace.'
        : role === 'server_admin' ? 'This name will be displayed in server management logs.'
            : 'Max 16 chars. No dots. A-Z, 0-9, _, -, space.';

    return (
        <div className="card">
            <div className="form-header-row">
                <h3 className="section-heading-h3">Display Name</h3>
            </div>

            <div className="form-group">
                <label className="form-label">{label}</label>
                <input
                    type="text"
                    className="form-input"
                    value={fields.username}
                    onChange={(e) => setField('username', e.target.value)}
                    placeholder={placeholder}
                    disabled={isSubmitting}
                />
                <p className="helper-text">
                    {helper}
                </p>
            </div>
        </div>
    );
};

export default memo(DisplayNameCard);
