import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type EnrollmentIdentityValues = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  pieceType: string;
  pieceNumber: string;
};

type EnrollmentIdentityFormProps = {
  values: EnrollmentIdentityValues;
  onChange?: (next: EnrollmentIdentityValues) => void;
  readOnly?: boolean;
};

const EnrollmentIdentityForm = ({
  values,
  onChange,
  readOnly = false,
}: EnrollmentIdentityFormProps) => {
  const readOnlyInputClassName = "focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none";

  const readOnlyInputProps = readOnly
    ? {
        tabIndex: -1,
        className: readOnlyInputClassName,
        onMouseDown: (event: React.MouseEvent<HTMLInputElement>) => {
          event.preventDefault();
        },
        onFocus: (event: React.FocusEvent<HTMLInputElement>) => {
          event.currentTarget.blur();
        },
      }
    : {};

  const update = (patch: Partial<EnrollmentIdentityValues>) => {
    if (!onChange) {
      return;
    }

    onChange({ ...values, ...patch });
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="space-y-1.5">
        <Label>Nom</Label>
        <Input
          value={values.lastName}
          readOnly={readOnly}
          onChange={(event) => update({ lastName: event.target.value })}
          {...readOnlyInputProps}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Prénom</Label>
        <Input
          value={values.firstName}
          readOnly={readOnly}
          onChange={(event) => update({ firstName: event.target.value })}
          {...readOnlyInputProps}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Date de naissance</Label>
        <Input
          type="date"
          value={values.dateOfBirth}
          readOnly={readOnly}
          onChange={(event) => update({ dateOfBirth: event.target.value })}
          {...readOnlyInputProps}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Type de pièce</Label>
        {readOnly ? (
          <Input value={values.pieceType} readOnly {...readOnlyInputProps} />
        ) : (
          <Select
            value={values.pieceType || "CNI"}
            onValueChange={(value) => update({ pieceType: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Type de pièce" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CNI">CNI</SelectItem>
              <SelectItem value="Passeport">Passeport</SelectItem>
              <SelectItem value="Permis de conduire">Permis de conduire</SelectItem>
              <SelectItem value="NINEA">NINEA</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label>Numéro pièce</Label>
        <Input
          value={values.pieceNumber}
          readOnly={readOnly}
          onChange={(event) => update({ pieceNumber: event.target.value })}
          {...readOnlyInputProps}
        />
      </div>
    </div>
  );
};

export default EnrollmentIdentityForm;
