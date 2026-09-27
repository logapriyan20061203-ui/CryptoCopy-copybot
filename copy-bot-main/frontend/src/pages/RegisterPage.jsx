import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layers, ShieldCheck, ArrowRight, Check, Circle, Eye, EyeOff } from 'lucide-react';
import Input from '../components/common/Input';
import { useAuth } from '../context/AuthContext';

const RegisterPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const { register } = useAuth();
  const navigate = useNavigate();

  // Password requirements checker
  const requirements = [
    { label: '8–100 characters', met: password.length >= 8 && password.length <= 100 },
    { label: 'Lowercase letter', met: /[a-z]/.test(password) },
    { label: 'Uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'Number', met: /[0-9]/.test(password) },
    { label: 'Special character', met: /[\W_]/.test(password) },
  ];

  const allRequirementsMet = requirements.every((r) => r.met);
  const allowedValidationMessages = {
    email: ['Email is required', 'Please provide a valid email address'],
    password: [
      'Password is required',
      'Password must be between 8 and 100 characters long',
      'Password must contain at least one lowercase letter',
      'Password must contain at least one uppercase letter',
      'Password must contain at least one number',
      'Password must contain at least one special character',
    ],
    displayName: ['Display name must be between 2 and 50 characters'],
  };

  const getSafeFieldErrors = (details = []) => details.reduce((errors, detail) => {
    if (allowedValidationMessages[detail.field]?.includes(detail.message)) {
      errors[detail.field] = detail.message;
    }
    return errors;
  }, {});

  const updateField = (field, setter) => (event) => {
    setter(event.target.value);
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setErrorMessage(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const nextFieldErrors = {};
    if (displayName && (displayName.trim().length < 2 || displayName.trim().length > 50)) {
      nextFieldErrors.displayName = 'Display name must be between 2 and 50 characters';
    }
    if (!allRequirementsMet) {
      nextFieldErrors.password = password.length > 100
        ? 'Password must be between 8 and 100 characters long'
        : 'Password does not meet the requirements below';
    }
    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setErrorMessage('Please review the highlighted fields.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setFieldErrors({});

    try {
      const result = await register({ email, password, displayName });
      if (result?.success) {
        navigate('/dashboard', { replace: true });
      } else {
        const errors = getSafeFieldErrors(result?.details);
        setFieldErrors(errors);
        if (result?.message === 'An account with this email address already exists') {
          setErrorMessage('An account with this email address already exists.');
        } else if (Object.keys(errors).length > 0) {
          setErrorMessage('Please review the highlighted fields.');
        } else {
          setErrorMessage('Unable to create your account. Please try again.');
        }
      }
    } catch {
      setErrorMessage('Unable to create your account. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="login-experience register-experience">
      <section className="login-context" aria-label="CryptoCopy platform information">
        <div className="login-brand">
          <span className="login-brand-mark" aria-hidden="true"><Layers size={19} /></span>
          <span className="login-brand-name">CryptoCopy</span>
        </div>

        <div className="login-context-copy">
          <p className="login-eyebrow">ON-CHAIN INTELLIGENCE</p>
          <h2>Clarity across every on-chain position.</h2>
          <p className="login-description">
            Monitor traders, configure copy rules, and review activity across supported networks.
          </p>
        </div>

        <div className="login-mode-note">
          <div className="login-mode-heading"><ShieldCheck size={16} /> EXECUTION MODES</div>
          <div className="login-mode-row"><span>PAPER</span><span>Virtual simulation</span></div>
          <div className="login-mode-row"><span>TESTNET</span><span>Supported test networks</span></div>
          <div className="login-mode-row login-mode-blocked"><span>MAINNET</span><span>Execution blocked</span></div>
        </div>
      </section>

      <section className="login-form-region" aria-label="Create account">
        <div className="login-form-panel">
          <p className="login-form-kicker">ACCOUNT SETUP</p>
          <h1>Create your account</h1>
          <p className="login-form-intro">Set up your CryptoCopy account to continue.</p>

          {errorMessage && (
            <div className="login-error" role="alert" aria-live="assertive">
              <span className="login-error-mark" aria-hidden="true">!</span>
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form register-form">
            <Input
              label="Display name (optional)"
              id="reg-name"
              name="displayName"
              type="text"
              value={displayName}
              onChange={updateField('displayName', setDisplayName)}
              placeholder="Your name or alias"
              autoComplete="nickname"
              error={fieldErrors.displayName}
              disabled={isSubmitting}
            />

            <Input
              label="Email address"
              id="reg-email"
              name="email"
              type="email"
              value={email}
              onChange={updateField('email', setEmail)}
              placeholder="name@example.com"
              required
              autoComplete="email"
              error={fieldErrors.email}
              disabled={isSubmitting}
            />

            <Input
              label="Password"
              id="reg-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={updateField('password', setPassword)}
              placeholder="Create a password"
              required
              autoComplete="new-password"
              error={fieldErrors.password}
              disabled={isSubmitting}
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="login-password-toggle"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  disabled={isSubmitting}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              }
            />

            <div className="register-requirements" role="group" aria-label="Password requirements">
              <p>Password must include</p>
              <ul>
                {requirements.map((requirement) => {
                  const Icon = requirement.met ? Check : Circle;
                  return (
                    <li key={requirement.label} className={requirement.met ? 'is-met' : ''}>
                      <Icon size={13} aria-hidden="true" />
                      <span>{requirement.label}</span>
                    </li>
                  );
                })}
              </ul>
            </div>

            <button
              type="submit"
              className="login-submit"
              disabled={isSubmitting || !allRequirementsMet}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? (
                <><span className="login-spinner" aria-hidden="true" /> Creating account</>
              ) : (
                <>Create account <ArrowRight size={17} aria-hidden="true" /></>
              )}
            </button>
          </form>

          <p className="login-register-prompt">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
        <p className="login-region-footer">CryptoCopy <span>·</span> On-Chain Intelligence</p>
      </section>
    </main>
  );
};

export default RegisterPage;
