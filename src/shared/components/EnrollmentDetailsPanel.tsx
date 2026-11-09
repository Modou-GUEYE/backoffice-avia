import { ReactNode } from "react";
import { FileText, Mail, MapPin, Phone } from "lucide-react";

type EnrollmentDocumentView = {
  type: string;
  uri: string;
};

type EnrollmentDetailsPanelProps = {
  fullName: string;
  statusNode: ReactNode;
  phone: string;
  email?: string | null;
  address?: string | null;
  nationalId?: string | null;
  documents?: EnrollmentDocumentView[];
};

const EnrollmentDetailsPanel = ({
  fullName,
  statusNode,
  phone,
  email,
  address,
  nationalId,
  documents,
}: EnrollmentDetailsPanelProps) => {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-muted-foreground">Nom complet</p>
          <p className="font-medium">{fullName}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Statut</p>
          {statusNode}
        </div>
        <div className="flex items-center gap-2">
          <Phone className="h-3 w-3 text-muted-foreground" />
          <span>{phone}</span>
        </div>
        <div className="flex items-center gap-2">
          <Mail className="h-3 w-3 text-muted-foreground" />
          <span>{email || "-"}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="h-3 w-3 text-muted-foreground" />
          <span>{address || "-"}</span>
        </div>
        <div className="flex items-center gap-2">
          <FileText className="h-3 w-3 text-muted-foreground" />
          <span>{nationalId || "-"}</span>
        </div>
      </div>

      {documents && documents.length > 0 && (
        <div className="border-t border-border pt-3 space-y-2">
          <p className="text-muted-foreground">Documents</p>
          <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
            {documents.map((document, index) => (
              <li key={`${document.type}-${index}`}>{document.type} — {document.uri}</li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
};

export default EnrollmentDetailsPanel;
