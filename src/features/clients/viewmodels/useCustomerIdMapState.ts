import { useState, useCallback } from "react";
import {
  readEnrollmentCustomerIdMap,
  readEnrollmentReferenceLinkMap,
  resolveReferenceLinkForEnrollment,
  resolveCustomerIdForEnrollment,
  withRememberedReferenceLink,
  withRememberedCustomerId,
  writeEnrollmentCustomerIdMap,
  writeEnrollmentReferenceLinkMap,
} from "./customerIdMapStore";
import { EnrollmentApplicationSchema } from "../models/types";

export const useCustomerIdMapState = () => {
  const [customerIdByEnrollmentId, setCustomerIdByEnrollmentId] = useState<Record<string, string>>(
    readEnrollmentCustomerIdMap,
  );
  const [referenceLinkByEnrollmentId, setReferenceLinkByEnrollmentId] = useState<Record<string, string>>(
    readEnrollmentReferenceLinkMap,
  );

  const rememberCustomerId = useCallback(
    (enrollmentId: string, customerId?: string | null) => {
      setCustomerIdByEnrollmentId((previous) => {
        const next = withRememberedCustomerId(previous, enrollmentId, customerId);
        if (next === previous) {
          return previous;
        }
        writeEnrollmentCustomerIdMap(next);
        return next;
      });
    },
    [],
  );

  const resolveCustomerId = useCallback(
    (enrollment: EnrollmentApplicationSchema): string | null => {
      return resolveCustomerIdForEnrollment(enrollment, customerIdByEnrollmentId);
    },
    [customerIdByEnrollmentId],
  );

  const rememberReferenceLink = useCallback(
    (enrollmentId: string, referenceLink?: string | null) => {
      setReferenceLinkByEnrollmentId((previous) => {
        const next = withRememberedReferenceLink(previous, enrollmentId, referenceLink);
        if (next === previous) {
          return previous;
        }

        writeEnrollmentReferenceLinkMap(next);
        return next;
      });
    },
    [],
  );

  const resolveReferenceLink = useCallback(
    (enrollment: EnrollmentApplicationSchema): string | null => {
      return resolveReferenceLinkForEnrollment(enrollment, referenceLinkByEnrollmentId);
    },
    [referenceLinkByEnrollmentId],
  );

  return {
    customerIdByEnrollmentId,
    setCustomerIdByEnrollmentId,
    rememberCustomerId,
    resolveCustomerId,
    referenceLinkByEnrollmentId,
    rememberReferenceLink,
    resolveReferenceLink,
  };
};
