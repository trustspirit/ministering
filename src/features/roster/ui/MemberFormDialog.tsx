import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Combobox, DatePicker, Dialog, Select, TextArea, TextField, useToast } from 'trust-ui-react';
import { householdDefaultName } from '@/features/households/domain/householdDefaultName';
import { HOUSEHOLDS_QUERY_KEY } from '@/features/households/hooks/useHouseholds';
import { useCreateHousehold } from '@/features/households/hooks/useHouseholdMutations';
import type { Household } from '@/features/households/types';
import {
  useCreateMember,
  useDeleteMember,
  useUpdateMember,
} from '@/features/members/hooks/useMemberMutations';
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
  // Keyboard focus: swapping the form for the confirmation unmounts the clicked button, so focus is placed
  // explicitly. Confirmation -> its safe action (취소); back to the form -> the 삭제 button that opened it.
  const deleteButtonRef = useRef<HTMLButtonElement>(null);
  const cancelDeleteRef = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);
  const [deleting, setDeleting] = useState(false);

  const qc = useQueryClient();
  const { toast } = useToast();
  const createMember = useCreateMember();
  const updateMember = useUpdateMember();
  const deleteMember = useDeleteMember();
  const createHousehold = useCreateHousehold();
  const busy =
    createMember.isPending || updateMember.isPending || deleteMember.isPending || createHousehold.isPending;

  const nameError = submitted && !fullName.trim() ? F.nameRequired : undefined;
  const genderError = submitted && !gender ? F.genderRequired : undefined;
  const birthError = submitted && !birthDate ? F.birthRequired : undefined;

  useEffect(() => {
    if (!confirmDelete) return;
    cancelDeleteRef.current?.focus();
    restoreFocus.current = true;
  }, [confirmDelete]);
  // Waits for `busy` so that a failed delete (button disabled while it ran) still gets its focus back.
  useEffect(() => {
    if (confirmDelete || !restoreFocus.current || busy || deleting || !open) return;
    restoreFocus.current = false;
    deleteButtonRef.current?.focus();
  }, [confirmDelete, busy, deleting, open]);

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
      if (createdHouseholdId) {
        const removed = await householdRepository.remove(createdHouseholdId).then(
          () => true,
          () => false,
        );
        await qc.invalidateQueries({ queryKey: HOUSEHOLDS_QUERY_KEY });
        if (!removed) toast({ variant: 'danger', message: F.rollbackFailed });
      }
      setError(F.saveFailed);
    }
  };

  const remove = async () => {
    if (!member) return;
    setDeleting(true);
    setConfirmDelete(false);
    setError(null);
    try {
      await deleteMember.mutateAsync(member.id);
      onClose();
    } catch {
      setError(F.deleteFailed);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      {/* One Dialog whose content switches between the form and the delete confirmation: closing one trust-ui
          Dialog while opening another makes the first report onClose (see the report, trust-ui 2.2.0), which
          would close the whole flow before the confirmation appears. */}
      <Dialog
        open={open}
        onClose={confirmDelete ? () => setConfirmDelete(false) : onClose}
        size={confirmDelete ? 'sm' : 'md'}
      >
        {confirmDelete && member ? (
          <>
            <Dialog.Title onClose={() => setConfirmDelete(false)}>{F.deleteTitle}</Dialog.Title>
            <Dialog.Content>
              <p className="ro-dialog-text">{F.deleteConfirm(member.full_name)}</p>
            </Dialog.Content>
            <Dialog.Actions>
              <Button
                ref={cancelDeleteRef}
                variant="ghost"
                size="sm"
                shape="square"
                onClick={() => setConfirmDelete(false)}
              >
                {F.cancel}
              </Button>
              <Button variant="danger" size="sm" shape="square" onClick={remove}>
                {F.confirmDelete}
              </Button>
            </Dialog.Actions>
          </>
        ) : (
          <>
            <Dialog.Title onClose={onClose}>{isEdit ? F.editTitle : F.createTitle}</Dialog.Title>
            <Dialog.Content>
              <form id="member-form" onSubmit={submit} noValidate>
                <div className="ro-form">
                  <div className="ro-wide">
                    <TextField
                      size="sm"
                      fullWidth
                      label={F.name}
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      error={!!nameError}
                      errorMessage={nameError}
                    />
                  </div>
                  <Select
                    size="sm"
                    fullWidth
                    label={F.gender}
                    required
                    placeholder={F.genderPlaceholder}
                    value={gender}
                    options={options(GENDER_LABEL)}
                    onChange={(v) => setGender(v as Gender)}
                    error={!!genderError}
                    errorMessage={genderError}
                  />
                  <DatePicker
                    size="sm"
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
                    <TextField
                      size="sm"
                      fullWidth
                      label={F.address}
                      placeholder={F.addressPlaceholder}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  </div>
                  <TextField
                    size="sm"
                    fullWidth
                    type="tel"
                    label={F.phone}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                  <Select
                    size="sm"
                    fullWidth
                    label={F.status}
                    value={status}
                    options={options(STATUS_LABEL)}
                    onChange={(v) => setStatus(v as ActiveStatus)}
                  />
                  <Select
                    size="sm"
                    fullWidth
                    label={F.personality}
                    value={personality}
                    options={options(PERSONALITY_LABEL)}
                    onChange={(v) => setPersonality(v as Personality)}
                  />
                  <Select
                    size="sm"
                    fullWidth
                    label={F.householdRole}
                    value={role}
                    options={options(F.roles)}
                    onChange={(v) => setRole(v as HouseholdRole)}
                  />
                  <div className="ro-wide">
                    <Combobox
                      size="sm"
                      fullWidth
                      label={F.household}
                      clearable={false}
                      placeholder={F.householdSearch}
                      emptyText={F.householdNoMatch}
                      value={householdChoice}
                      options={[
                        { value: NONE, label: F.householdNone },
                        { value: NEW, label: F.householdNew },
                        ...households.map((h) => ({ value: h.id, label: h.name })),
                      ]}
                      // The "가정 없음" item is the way to clear, so an emptied field falls back to it.
                      onChange={(v) => setHouseholdChoice(v ?? NONE)}
                    />
                  </div>
                  <div className="ro-wide">
                    <TextArea
                      size="sm"
                      rows={2}
                      autoResize
                      fullWidth
                      label={F.memo}
                      value={memo}
                      onValueChange={setMemo}
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
                  ref={deleteButtonRef}
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
          </>
        )}
      </Dialog>
    </>
  );
}
