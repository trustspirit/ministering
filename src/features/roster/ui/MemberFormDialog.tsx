import { useState, type FormEvent } from 'react';
import { Button, DatePicker, Dialog, Select, TextField } from 'trust-ui-react';
import { householdDefaultName } from '@/features/households/domain/householdDefaultName';
import { useCreateHousehold } from '@/features/households/hooks/useHouseholdMutations';
import type { Household } from '@/features/households/types';
import { useCreateMember, useDeleteMember, useUpdateMember } from '@/features/members/hooks/useMemberMutations';
import type { ActiveStatus, Gender, HouseholdRole, Member, Personality } from '@/features/members/types';
import { householdRepository } from '@/repositories/HouseholdRepository';
import { GENDER_LABEL, PERSONALITY_LABEL, STATUS_LABEL, T } from '@/shared/copy';
import { parseIsoDate, toIsoDate } from './dates';
import './roster.css';

const NONE = '__none__';
const NEW = '__new__';
const F = T.memberForm;

interface MemberFormDialogProps {
  open: boolean;
  /** null = register a new person */
  member: Member | null;
  households: Household[];
  onClose: () => void;
}

const options = <K extends string>(labels: Record<K, string>) =>
  (Object.keys(labels) as K[]).map((value) => ({ value, label: labels[value] }));

/** Mount with a `key` per person so every opening starts from that person's values. */
export function MemberFormDialog({ open, member, households, onClose }: MemberFormDialogProps) {
  const isEdit = member !== null;
  const [fullName, setFullName] = useState(member?.full_name ?? '');
  const [gender, setGender] = useState<Gender | ''>(member?.gender ?? '');
  const [birthDate, setBirthDate] = useState(member?.birth_date ?? '');
  const [address, setAddress] = useState(member?.address ?? '');
  const [phone, setPhone] = useState(member?.phone ?? '');
  const [status, setStatus] = useState<ActiveStatus>(member?.active_status ?? 'active');
  const [personality, setPersonality] = useState<Personality>(member?.personality ?? 'moderate');
  const [householdChoice, setHouseholdChoice] = useState(member?.household_id ?? NONE);
  const [role, setRole] = useState<HouseholdRole>(member?.household_role ?? 'other');
  const [memo, setMemo] = useState(member?.memo ?? '');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const createMember = useCreateMember();
  const updateMember = useUpdateMember();
  const deleteMember = useDeleteMember();
  const createHousehold = useCreateHousehold();
  const busy =
    createMember.isPending || updateMember.isPending || deleteMember.isPending || createHousehold.isPending;

  const nameError = submitted && !fullName.trim() ? F.nameRequired : undefined;
  const genderError = submitted && !gender ? F.genderRequired : undefined;
  const birthError = submitted && !birthDate ? F.birthRequired : undefined;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setError(null);
    if (!fullName.trim() || !gender || !birthDate) return;

    const name = fullName.trim();
    const trimmedAddress = address.trim() || null;
    let createdHouseholdId: string | null = null;
    try {
      let householdId: string | null = householdChoice === NONE ? null : householdChoice;
      if (householdChoice === NEW) {
        const created = await createHousehold.mutateAsync({
          name: householdDefaultName([
            { full_name: name, household_role: role, birth_date: birthDate, gender },
          ]),
          address: trimmedAddress,
        });
        createdHouseholdId = created.id;
        householdId = created.id;
      }
      const fields = {
        full_name: name,
        gender,
        birth_date: birthDate,
        address: trimmedAddress,
        phone: phone.trim() || null,
        active_status: status,
        personality,
        household_id: householdId,
        household_role: role,
        memo: memo.trim() ? memo.trimEnd() : null,
      };
      if (member) {
        await updateMember.mutateAsync({ id: member.id, patch: fields, previousAddress: member.address });
      } else {
        await createMember.mutateAsync(fields);
      }
      onClose();
    } catch {
      // Do not leave an empty household behind when the person could not be saved.
      if (createdHouseholdId) await householdRepository.remove(createdHouseholdId).catch(() => {});
      setError(F.saveFailed);
    }
  };

  const remove = async () => {
    if (!member) return;
    setConfirmDelete(false);
    setError(null);
    try {
      await deleteMember.mutateAsync(member.id);
      onClose();
    } catch {
      setError(F.deleteFailed);
    }
  };

  return (
    <>
      <Dialog open={open && !confirmDelete} onClose={onClose} size="md">
        <Dialog.Title onClose={onClose}>{isEdit ? F.editTitle : F.createTitle}</Dialog.Title>
        <Dialog.Content>
          <form id="member-form" onSubmit={submit} noValidate>
            <div className="ro-form">
              <div className="ro-wide">
                <TextField size="sm"
                  fullWidth
                  label={F.name}
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  error={!!nameError}
                  errorMessage={nameError}
                />
              </div>
              <Select size="sm"
                fullWidth
                label={F.gender}
                required
                value={gender}
                options={options(GENDER_LABEL)}
                onChange={(v) => setGender(v as Gender)}
                error={!!genderError}
                errorMessage={genderError}
              />
              <DatePicker size="sm"
                label={F.birthDate}
                required
                mobileVariant="native"
                value={parseIsoDate(birthDate)}
                maxDate={new Date()}
                onChange={(d) => setBirthDate(d ? toIsoDate(d) : '')}
                error={!!birthError}
                errorMessage={birthError}
              />
              <div className="ro-wide">
                <TextField size="sm"
                  fullWidth
                  label={F.address}
                  placeholder={F.addressPlaceholder}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
              <TextField size="sm"
                fullWidth
                type="tel"
                label={F.phone}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <Select size="sm"
                fullWidth
                label={F.status}
                value={status}
                options={options(STATUS_LABEL)}
                onChange={(v) => setStatus(v as ActiveStatus)}
              />
              <Select size="sm"
                fullWidth
                label={F.personality}
                value={personality}
                options={options(PERSONALITY_LABEL)}
                onChange={(v) => setPersonality(v as Personality)}
              />
              <Select size="sm"
                fullWidth
                label={F.householdRole}
                value={role}
                options={options(F.roles)}
                onChange={(v) => setRole(v as HouseholdRole)}
              />
              <div className="ro-wide">
                <Select size="sm"
                  fullWidth
                  searchable
                  label={F.household}
                  value={householdChoice}
                  options={[
                    { value: NONE, label: F.householdNone },
                    { value: NEW, label: F.householdNew },
                    ...households.map((h) => ({ value: h.id, label: h.name })),
                  ]}
                  onChange={(v) => setHouseholdChoice(String(v))}
                />
              </div>
              <div className="ro-wide">
                <TextField size="sm"
                  multiline
                  rows={2}
                  fullWidth
                  label={F.memo}
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                />
              </div>
            </div>
          </form>
            {error && (
              <p className="ro-error" role="alert">
                ⚠ {error}
              </p>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            {isEdit && (
              <Button
                type="button"
                variant="danger"
                size="sm"
                shape="square"
                disabled={busy}
                onClick={() => setConfirmDelete(true)}
                style={{ marginRight: 'auto' }}
              >
                {F.delete}
              </Button>
            )}
            <Button type="button" variant="ghost" size="sm" shape="square" disabled={busy} onClick={onClose}>
              {F.cancel}
            </Button>
            <Button type="submit" form="member-form" variant="primary" size="sm" shape="square" disabled={busy}>
              {busy ? F.saving : F.save}
            </Button>
          </Dialog.Actions>
      </Dialog>

      {member && (
        <Dialog open={open && confirmDelete} onClose={() => setConfirmDelete(false)} size="sm">
          <Dialog.Title onClose={() => setConfirmDelete(false)}>{F.deleteTitle}</Dialog.Title>
          <Dialog.Content>
            <p className="ro-dialog-text">{F.deleteConfirm(member.full_name)}</p>
          </Dialog.Content>
          <Dialog.Actions>
            <Button variant="ghost" size="sm" shape="square" onClick={() => setConfirmDelete(false)}>
              {F.cancel}
            </Button>
            <Button variant="danger" size="sm" shape="square" onClick={remove}>
              {F.confirmDelete}
            </Button>
          </Dialog.Actions>
        </Dialog>
      )}
    </>
  );
}
