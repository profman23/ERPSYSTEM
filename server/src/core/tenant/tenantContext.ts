export class TenantContext {
  private static currentTenantId: string | null = null;

  static setTenantId(tenantId: string) {
    this.currentTenantId = tenantId;
  }

  static getTenantId(): string | null {
    return this.currentTenantId;
  }

  static clear() {
    this.currentTenantId = null;
  }
}
