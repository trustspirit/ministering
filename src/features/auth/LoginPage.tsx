import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, TextField } from 'trust-ui-react';
import { T, UNIT_NAME } from '@/shared/copy';
import { safeRedirect } from './safeRedirect';
import { useAuth } from './useAuth';
import './login.css';

/** Wrong email or password is an HTTP 400 from the auth server; anything else is a connection or server problem. */
function isInvalidCredentials(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'status' in err && (err as { status?: number }).status === 400;
}

export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signIn(email.trim(), password);
      navigate(safeRedirect(params.get('redirect')), { replace: true });
    } catch (err) {
      setError(isInvalidCredentials(err) ? T.login.invalidCredentials : T.login.failed);
      setBusy(false);
    }
  };

  return (
    <main className="lg">
      <article>
        <div className="lg-band">
          <img src="/brand/church-symbol-ko-white.png" alt={T.header.logoAlt} />
        </div>
        <header className="lg-head">
          <h1>{T.login.title}</h1>
          {UNIT_NAME && <p>{UNIT_NAME}</p>}
        </header>
        <form onSubmit={onSubmit} className="lg-form">
          <TextField
            type="email"
            size="sm"
            fullWidth
            label={T.login.email}
            required
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <TextField
            type="password"
            size="sm"
            fullWidth
            label={T.login.password}
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && (
            <p className="lg-error" role="alert">
              {T.warnMark} {error}
            </p>
          )}
          <Button type="submit" size="sm" shape="square" fullWidth loading={busy} disabled={busy}>
            {busy ? T.login.submitting : T.login.submit}
          </Button>
        </form>
        <p className="lg-help">{T.login.forgot}</p>
      </article>
    </main>
  );
}
