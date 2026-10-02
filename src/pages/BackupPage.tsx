// Backup & restore: export everything to a file, or restore from one; keep a copy in a folder on
// desktop. Google Drive comes next.

import { useLiveQuery } from 'dexie-react-hooks'
import {
  ChevronRight,
  CloudUpload,
  Download,
  FileSpreadsheet,
  FileUp,
  FolderSync,
  HardDrive,
  ShieldCheck,
} from 'lucide-react'
import { useRef, useState, type ChangeEvent } from 'react'
import { Link } from 'react-router'

import { Card, SectionLabel } from '../components/ui'
import {
  backupFileName,
  BackupError,
  countEntries,
  createBackup,
  parseBackup,
  restoreBackup,
  type Backup,
} from '../data/backup'
import { describeBackup, recordBackup, useBackupStatus } from '../lib/backupStatus'
import {
  allowFolder,
  chooseFolder,
  folderBackupSupported,
  forgetFolder,
  useFolderBackup,
  writeNow,
} from '../lib/folderBackup'

export function BackupPage() {
  const status = useBackupStatus()
  const entries = useLiveQuery(countEntries)
  const fileInput = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<{ backup: Backup; name: string } | null>(null)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  async function exportFile() {
    const backup = await createBackup()
    const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = backupFileName()
    link.click()
    setTimeout(() => URL.revokeObjectURL(link.href), 10_000)
    recordBackup('file')
    setMessage({
      kind: 'ok',
      text: 'Backup file saved. Keep it somewhere safe, like your Drive or email.',
    })
  }

  async function pickFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      setPending({ backup: parseBackup(await file.text()), name: file.name })
      setMessage(null)
    } catch (error) {
      setMessage({
        kind: 'error',
        text: error instanceof BackupError ? error.message : "That file couldn't be read.",
      })
    }
  }

  async function restore() {
    if (!pending) return
    await restoreBackup(pending.backup)
    recordBackup('file', pending.backup.exportedAt) // this device now matches that backup
    setPending(null)
    setMessage({ kind: 'ok', text: 'Restored. Everything from the backup is back on this device.' })
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-2">
      <Card className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-card-2">
          <HardDrive className="size-5 text-ink-2" />
        </span>
        <div>
          <p className="text-heading">{describeBackup(status)}</p>
          <p className="text-label text-ink-2">
            {entries ?? 0} entries live on this device. Back them up so a lost phone or a cleared
            browser doesn't take them with it.
          </p>
        </div>
      </Card>

      <SectionLabel>Backup file</SectionLabel>
      <Card className="flex flex-col divide-y divide-line py-1">
        <button
          type="button"
          onClick={exportFile}
          className="flex items-center gap-3 py-3 text-left"
        >
          <Download className="size-5 text-accent" />
          <span className="flex-1">
            <span className="block text-body font-medium">Export all data</span>
            <span className="text-label text-ink-2">One file with every log and your settings</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="flex items-center gap-3 py-3 text-left"
        >
          <FileUp className="size-5 text-accent" />
          <span className="flex-1">
            <span className="block text-body font-medium">Restore from a file</span>
            <span className="text-label text-ink-2">Replaces what's on this device</span>
          </span>
        </button>
      </Card>
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={pickFile}
      />

      {pending && (
        <Card className="flex flex-col gap-3 border-lift/30 bg-lift/8">
          <p className="text-body">
            Restore <strong>{pending.name}</strong> from{' '}
            {new Date(pending.backup.exportedAt).toLocaleString('en-US', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
            ? Everything currently on this device will be replaced.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPending(null)}
              className="h-10 flex-1 rounded-full bg-card font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={restore}
              className="h-10 flex-1 rounded-full bg-lift font-semibold text-black"
            >
              Replace and restore
            </button>
          </div>
        </Card>
      )}

      {message && (
        <p
          role={message.kind === 'error' ? 'alert' : 'status'}
          className={`rounded-xl px-4 py-3 text-label ${message.kind === 'error' ? 'bg-danger/10 text-danger' : 'bg-success-soft text-success'}`}
        >
          {message.text}
        </p>
      )}

      <SectionLabel>Spreadsheet</SectionLabel>
      <Link to="/export" className="block">
        <Card as="div" className="flex items-center gap-3">
          <FileSpreadsheet className="size-5 shrink-0 text-accent" />
          <span className="flex-1">
            <span className="block text-body font-medium">Export to Excel or CSV</span>
            <span className="text-label text-ink-2">
              To read or analyse your logs in a spreadsheet (not for restoring)
            </span>
          </span>
          <ChevronRight className="size-4 text-ink-3" />
        </Card>
      </Link>

      {folderBackupSupported && <FolderSection />}

      <SectionLabel>Google Drive</SectionLabel>
      <Card className="flex items-start gap-3 bg-card-2/60">
        <CloudUpload className="mt-0.5 size-5 shrink-0 text-ink-2" />
        <div>
          <p className="text-body font-medium">Automatic Drive backup is coming next</p>
          <p className="text-label text-ink-2">
            Like WhatsApp: your logs and photos backed up to a LifeLogs folder in your own Google
            Drive, and restored on a new phone.
          </p>
        </div>
      </Card>

      <p className="flex items-center gap-2 px-1 pt-4 text-label text-ink-3">
        <ShieldCheck className="size-4" /> Backups contain only your data. Nothing is sent to us.
      </p>
    </div>
  )
}

function FolderSection() {
  const folder = useFolderBackup()
  const last = folder.lastWrite ? describeBackup({ at: folder.lastWrite, where: 'folder' }) : null
  return (
    <>
      <SectionLabel>Folder on this computer</SectionLabel>
      <Card className="flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <FolderSync className="mt-0.5 size-5 shrink-0 text-accent" />
          <div className="flex-1">
            {folder.folder ? (
              <>
                <p className="text-body font-medium">
                  Saving to <span className="font-semibold">{folder.folder}</span>
                </p>
                <p className="text-label text-ink-2">
                  {folder.permission === 'granted'
                    ? `${last ?? 'Not saved yet'}. Updated a few seconds after every change; the last 7 days are kept.`
                    : 'The browser needs your OK again before saving to this folder.'}
                </p>
              </>
            ) : (
              <>
                <p className="text-body font-medium">Keep a copy in a folder</p>
                <p className="text-label text-ink-2">
                  Pick a folder (one that syncs, like Google Drive or OneDrive, works well). A
                  backup is saved there after every change, one file per day, last 7 days kept.
                </p>
              </>
            )}
          </div>
        </div>
        {folder.error && (
          <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-label text-danger">
            {folder.error}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {!folder.folder && (
            <button
              type="button"
              onClick={chooseFolder}
              className="h-10 rounded-full bg-accent px-4 text-label font-semibold text-on-accent"
            >
              Choose folder
            </button>
          )}
          {folder.folder && folder.permission !== 'granted' && (
            <button
              type="button"
              onClick={allowFolder}
              className="h-10 rounded-full bg-accent px-4 text-label font-semibold text-on-accent"
            >
              Allow saving
            </button>
          )}
          {folder.folder && folder.permission === 'granted' && (
            <button
              type="button"
              onClick={writeNow}
              className="h-10 rounded-full bg-card-2 px-4 text-label font-medium"
            >
              Save now
            </button>
          )}
          {folder.folder && (
            <>
              <button
                type="button"
                onClick={chooseFolder}
                className="h-10 rounded-full bg-card-2 px-4 text-label font-medium"
              >
                Change folder
              </button>
              <button
                type="button"
                onClick={forgetFolder}
                className="h-10 rounded-full px-4 text-label font-medium text-ink-2"
              >
                Stop
              </button>
            </>
          )}
        </div>
      </Card>
    </>
  )
}
