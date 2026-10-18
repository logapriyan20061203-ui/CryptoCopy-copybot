import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Layers, Eye, EyeOff, ArrowRight, ShieldCheck } from 'lucide-react';
import Input from '../components/common/Input';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await login(email, password);
      if (result?.success) {
        navigate(from, { replace: true });
      } else {
        setErrorMessage(
          result?.message?.trim().toLowerCase() === 'invalid email or password'
            ? 'Invalid email or password.'
            : result?.message || 'Unable to sign in. Please try again.'
        );
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message
        || (!err.response ? 'Unable to reach the server. Check your connection and try again.' : 'Unable to sign in. Please try again.')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="login-experience">
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

      <section className="login-form-region" aria-label="Sign in">
        <div className="login-form-panel">
          <p className="login-form-kicker">ACCOUNT ACCESS</p>
          <h1>Welcome back</h1>
          <p className="login-form-intro">Sign in to continue to CryptoCopy.</p>

          {errorMessage && (
            <div id="login-error" className="login-error" role="alert" aria-live="assertive">
              <span className="login-error-mark" aria-hidden="true">!</span>
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            <Input
              label="Email address"
              id="login-email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
              autoComplete="email"
              disabled={isSubmitting}
            />

            <Input
              label="Password"
              id="login-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
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

            <button
              type="submit"
              className="login-submit"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? (
                <><span className="login-spinner" aria-hidden="true" /> Signing in</>
              ) : (
                <>Sign in <ArrowRight size={17} aria-hidden="true" /></>
              )}
            </button>
          </form>

          <p className="login-register-prompt">
            Don’t have an account? <Link to="/register">Create account</Link>
          </p>
        </div>
        <p className="login-region-footer">CryptoCopy <span>·</span> On-Chain Intelligence</p>
      </section>
    </main>
  );
};

export default LoginPage;
