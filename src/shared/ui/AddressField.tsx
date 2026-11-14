import { useEffect, useRef, useState } from 'react';
import { Combobox, TextField, type ComboboxOption } from 'trust-ui-react';
import { searchAddresses, type AddressHit } from '@/shared/lib/addressSearch';
import { T } from '@/shared/copy';

/** What a household stores: the address text and the coordinates Kakao gave for it. */
export interface AddressValue {
  address: string | null;
  lat: number | null;
  lng: number | null;
}

interface AddressFieldProps {
  label: string;
  value: AddressValue;
  onChange: (value: AddressValue) => void;
  helperText?: string;
  /** Injected in tests; the app uses the Kakao search. */
  search?: (query: string) => Promise<AddressHit[]>;
}

const CURRENT = 'current';
const DEBOUNCE_MS = 250;
const A = T.addressField;

/**
 * Address input that only accepts an address picked from Kakao's results, so the saved text always has
 * coordinates on the map. 동·호수 go in a separate detail field and are appended to the picked address.
 */
export function AddressField({ label, value, onChange, helperText, search = searchAddresses }: AddressFieldProps) {
  const [base, setBase] = useState<AddressValue>(value);
  const [detail, setDetail] = useState('');
  const [hits, setHits] = useState<AddressHit[]>([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const latest = useRef(0);

  useEffect(() => () => clearTimeout(timer.current), []);

  const emit = (next: AddressValue, nextDetail: string) => {
    const text = [next.address, nextDetail.trim()].filter(Boolean).join(' ');
    onChange(next.address ? { address: text, lat: next.lat, lng: next.lng } : { address: null, lat: null, lng: null });
  };

  const onSearch = (query: string) => {
    clearTimeout(timer.current);
    setLoading(true);
    const ticket = ++latest.current;
    timer.current = setTimeout(async () => {
      const found = await search(query);
      if (ticket !== latest.current) return;
      setHits(found);
      setLoading(false);
    }, DEBOUNCE_MS);
  };

  const options: ComboboxOption[] = hits.map((h) => ({ value: h.id, label: h.address, description: h.description }));
  // The saved address stays selectable so the field shows it; it is not one of the search results.
  if (base.address && !hits.some((h) => h.address === base.address)) {
    options.push({ value: CURRENT, label: base.address, description: A.current });
  }
  const selected = base.address ? (hits.find((h) => h.address === base.address)?.id ?? CURRENT) : null;

  return (
    <>
      <Combobox
        size="sm"
        fullWidth
        label={label}
        placeholder={A.placeholder}
        helperText={helperText}
        emptyText={A.empty}
        loadingText={A.loading}
        clearable
        clearLabel={A.clear}
        minQueryLength={2}
        filter={null}
        loading={loading}
        options={options}
        onSearch={onSearch}
        value={selected}
        onChange={(id) => {
          if (id === null) {
            setBase({ address: null, lat: null, lng: null });
            setDetail('');
            emit({ address: null, lat: null, lng: null }, '');
            return;
          }
          const hit = hits.find((h) => h.id === id);
          if (!hit) return;
          const next = { address: hit.address, lat: hit.lat, lng: hit.lng };
          setBase(next);
          emit(next, detail);
        }}
      />
      {base.address && (
        <TextField
          size="sm"
          fullWidth
          label={A.detail}
          placeholder={A.detailPlaceholder}
          value={detail}
          onChange={(e) => {
            setDetail(e.target.value);
            emit(base, e.target.value);
          }}
        />
      )}
    </>
  );
}
