import React from 'react';

const Input = ({
  label,
  id,
  name,
  type = 'text',
  value,
  onChange,
  placeholder = '',
  error = null,
  required = false,
  autoComplete = 'off',
  disabled = false,
  rightElement = null,
  style = {},
}) => {
  return (
    <div className="form-group">
      {label && (
        <label htmlFor={id || name} className="form-label">
          {label} {required && <span style={{ color: 'var(--accent-red)' }}>*</span>}
        </label>
      )}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          id={id || name}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          autoComplete={autoComplete}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? `${id || name}-error` : undefined}
          className="form-input"
          style={{
            width: '100%',
            paddingRight: rightElement ? '40px' : undefined,
            borderColor: error ? 'var(--accent-red)' : undefined,
            ...style,
          }}
        />
        {rightElement && (
          <div
            style={{
              position: 'absolute',
              right: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {rightElement}
          </div>
        )}
      </div>
      {error && <span id={`${id || name}-error`} className="form-error" style={{ fontSize: '0.75rem', color: 'var(--accent-red)', marginTop: '4px', display: 'block' }}>{error}</span>}
    </div>
  );
};

export default Input;
