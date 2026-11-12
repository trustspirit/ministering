import { useMemo, useRef, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, TextField } from 'trust-ui-react';
import { parsePasswordLink } from '@/features/auth/passwordLink';
import { useAuth } from '@/features/auth/useAuth';
import { T } from '@/shared/copy';
import { usePrivateDocument } from '@/shared/hooks/usePrivateDocument';
import { supabase } from '@/shared/lib/supabase';
import './SetPasswordPage.css';

const S = T.setPassword;
const MIN_LENGTH = 8;

interface AuthErrorLike {
  status?: number;
  code?: string;
}

/** The auth server refused the token itself (used, replaced, expired, wrong): a client error other than throttling. */
function isLinkRejected(err: AuthErrorLike): boolean {
  return typeof err.status === 'number' && err.status >= 400 && err.status < 500 && err.status !== 429;
}

function passwordMessage(err: AuthErrorLike): string {
  if (err.code === 'weak_password' || err.status === 422) {
    return err.code === 'same_password' ? S.samePassword : S.weak;
  }
  return S.saveFailed;
}

/**
 * Public page behind the one-time link from the bishopric. Opening it (or a messenger's link preview) does not use
 * the token: it is verified only when the person submits their new password.
 */
export default function SetPasswordPage() {
  usePrivateDocument(S.documentTitle);
  const { search } = useLocation();
  const link = useMemo(() => parsePasswordLink(search), [search]);
  const navigate = useNavigate();
  // Another account may be signed in here (e.g. the admin trying the link); the link's account replaces it.
  const { user: currentUser } = useAuth();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [rejected, setRejected] = useState(false);
  // Set once the token has been used: the session now belongs to this account, so a retry only saves the password.
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);
  const busyRef = useRef(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!link || busyRef.current) return;
    if (password.length < MIN_LENGTH) return setError(S.tooShort);
    if (password !== confirm) return setError(S.mismatch);
    setError(null);
    busyRef.current = true;
    setBusy(true);
    try {
      if (verifiedEmail === null) {
        let result;
        try {
          result = await supabase.auth.verifyOtp({ token_hash: link.tokenHash, type: link.type });
        } catch {
          setError(S.verifyFailed);
          return;
        }
        if (result.error) {
          if (isLinkRejected(result.error)) setRejected(true);
          else setError(S.verifyFailed);
          return;
        }
        // Whatever session this browser had before (e.g. the admin's own), it is now this account's.
        setVerifiedEmail(result.data.session?.user.email ?? result.data.user?.email ?? '');
      }
      let saved;
      try {
        saved = await supabase.auth.updateUser({ password });
      } catch {
        setError(S.saveFailed);
        return;
      }
      if (saved.error) {
        setError(passwordMessage(saved.error));
        return;
      }
      navigate('/', { replace: true });
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  return (
    <main className="spw">
      <article>
        <div className="spw-band">
          <img src="/brand/church-symbol-ko-white.png" alt={T.header.logoAlt} />
        </div>
        <h1>{S.title}</h1>
        {!link || rejected ? (
          <p className="spw-msg" role={rejected ? 'alert' : undefined}>
            {S.invalid}
          </p>
        ) : (
          <>
            {verifiedEmail ? (
              <p className="spw-account">{S.forAccount(verifiedEmail)}</p>
            ) : (
              <>
                <p className="spw-intro">{S.intro}</p>
                {currentUser?.email && <p className="spw-other">{T.warnMark} {S.signedInAs(currentUser.email)}</p>}
              </>
            )}
            <form className="spw-form" onSubmit={onSubmit} noValidate>
              <p className="spw-rules">{S.rules}</p>
              <TextField
                type="password"
                size="sm"
                fullWidth
                label={S.password}
                autoComplete="new-password"
                autoCapitalize="none"
                spellCheck={false}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <TextField
                type="password"
                size="sm"
                fullWidth
                label={S.confirm}
                autoComplete="new-password"
                autoCapitalize="none"
                spellCheck={false}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
              {error && (
                <p className="spw-error" role="alert">
                  {T.warnMark} {error}
                </p>
              )}
              <Button type="submit" size="sm" shape="square" fullWidth loading={busy} disabled={busy}>
                {busy ? S.submitting : S.submit}
              </Button>
            </form>
          </>
        )}
      </article>
    </main>
  );
}
