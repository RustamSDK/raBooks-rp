export interface SecurityAuditRecord {
  readonly id?: number | string;
  readonly tenantId: string;
  readonly timestamp: string;
  readonly actor: string;
  readonly action: string;
  readonly target: string;
  readonly details: string;
}
