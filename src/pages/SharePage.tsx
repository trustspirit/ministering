import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Skeleton, Spinner } from 'trust-ui-react';
import { isShareTokenShape } from '@/features/share/shareToken';
import {
  useMinistryShare,
  type MinistryShare,
  type SharePhone,
} from '@/features/share/useMinistryShare';
import { GENDER_LABEL, ORG_LABEL, T, UNIT_NAME } from '@/shared/copy';
import './SharePage.css';

const S = T.share.page;

function formatToday(d = new Date()): string {
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

/** Keeps the link's token out of Referer headers while this page is open. */
function usePrivateDocument() {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = S.documentTitle;
    const meta = document.createElement('meta');
    meta.name = 'referrer';
    meta.content = 'no-referrer';
    document.head.appendChild(meta);
    return () => {
      document.title = previousTitle;
      meta.remove();
    };
  }, []);
}

function Phone({ phone }: { phone: string | null }) {
  return phone ? <a href={`tel:${phone}`}>{phone}</a> : <span className="sp-none">{S.noPhone}</span>;
}

function PhoneRows({ people }: { people: SharePhone[] }) {
  return (
    <table className="sp-table">
      <tbody>
        {people.map((p, i) => (
          <tr key={i}>
            <td>
              <b>{p.name}</b>
            </td>
            <td>
              <Phone phone={p.phone} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Recipients({ share }: { share: MinistryShare }) {
  return (
    <>
      {share.recipients.map((r, i) =>
        r.type === 'household' ? (
          <div className="sp-household" key={i}>
            <b>{r.name}</b>
            <table className="sp-table">
              <tbody>
                {r.members.map((m, j) => (
                  <tr key={j}>
                    <td>{m.name}</td>
                    <td>{T.detail.ageUnit(m.age)}</td>
                    <td>{GENDER_LABEL[m.gender]}</td>
                    <td>
                      <Phone phone={m.phone} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null,
      )}
      <PhoneRows people={share.recipients.flatMap((r) => (r.type === 'member' ? [r] : []))} />
    </>
  );
}

export default function SharePage() {
  usePrivateDocument();
  const { token } = useParams<{ token: string }>();
  const query = useMinistryShare(token);
  const share = query.data;

  let body;
  if (!isShareTokenShape(token) || query.isError || share === null) {
    body = <p className="sp-msg">{S.invalid}</p>;
  } else if (!share) {
    body = (
      <>
        <div className="sp-msg sp-msg--quiet">
          <Spinner size="sm" label={S.loading} showLabel />
        </div>
        {/* A placeholder the size of the real page (title, name, two lists) so nothing jumps when it arrives. */}
        <Skeleton shape="text" width="60%" height={19} />
        <Skeleton shape="text" lines={4} height={13} style={{ marginTop: 18 }} />
      </>
    );
  } else {
    const noun = T.assign.companionNoun[share.organization];
    const recipientNoun = T.assign.recipientNoun[share.organization];
    body = (
      <>
        <h1>{S.title(ORG_LABEL[share.organization])}</h1>
        <p className="sp-who">{share.name?.trim() || T.ministry.defaultLabel(share.number)}</p>
        <p className="sp-meta">{S.meta(UNIT_NAME, formatToday())}</p>
        <h2>{S.companions(noun)}</h2>
        <PhoneRows people={share.companions} />
        <h2>{S.recipients(recipientNoun)}</h2>
        {share.recipients.length === 0 ? (
          <p className="sp-meta">{S.noRecipients}</p>
        ) : (
          <Recipients share={share} />
        )}
      </>
    );
  }

  return (
    <main className="sp">
      <article>
        <div className="sp-band">
          <img src="/brand/church-symbol-ko-white.png" alt={T.header.logoAlt} />
        </div>
        {body}
      </article>
    </main>
  );
}
