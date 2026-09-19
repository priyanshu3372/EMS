import { env } from '../../config/env'
import { LocalStorage } from './local'

/**
 * File storage, behind one interface.
 *
 * Nothing outside this folder ever knows where a file physically lives. In
 * development that is the local disk; in production it is Cloudflare R2. The
 * switch is one environment variable, and adding a third backend is a new file.
 *
 * Production deliberately does NOT use the VPS disk. A VPS disk is a single
 * copy, and these are Aadhaar scans and payslip PDFs kept for years — they
 * would need backing up to R2 anyway, so they live in R2 to begin with.
 */
export interface StorageService {
  put(key: string, body: Buffer, contentType: string): Promise<void>
  get(key: string): Promise<Buffer>
  delete(key: string): Promise<void>
  exists(key: string): Promise<boolean>
}

/**
 * Keys always carry the company, because renaming object keys after go-live is
 * a data migration. Callers pass structured parts rather than a string, so a
 * user-supplied filename can never become part of the path.
 */
export function storageKey(parts: {
  organizationId: string
  kind: 'employee-document' | 'payslip' | 'bank-proof' | 'company-document'
  ownerId: string
  fileId: string
  extension: string
}): string {
  const safe = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, '')
  return [
    'org',
    safe(parts.organizationId),
    parts.kind,
    safe(parts.ownerId),
    `${safe(parts.fileId)}.${safe(parts.extension)}`,
  ].join('/')
}

let instance: StorageService | null = null

export function storage(): StorageService {
  if (instance) return instance

  switch (env.STORAGE_DRIVER) {
    case 'local':
      instance = new LocalStorage(env.STORAGE_PATH)
      return instance
    // 'r2' lands on Day 19, implementing the same interface.
    default:
      throw new Error(`Unknown STORAGE_DRIVER: ${env.STORAGE_DRIVER}`)
  }
}
