'use client'

import { useState } from 'react'
import type { DistributionAccount } from '@/domain/distribution'
import { ConnectModal } from './ConnectModal'

interface ReconnectButtonProps {
  account: DistributionAccount
  oauthUrl: string | null
}

export function ReconnectButton({ account, oauthUrl }: ReconnectButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (!oauthUrl) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="text-xs px-2.5 py-1 rounded-md transition-colors hover:bg-black/5 dark:hover:bg-white/5"
        style={{ color: 'var(--muted)' }}
      >
        Reconnect
      </button>
      {isOpen && (
        <ConnectModal
          platform={{
            id: account.platform,
            label: account.platform,
            icon: '',
            color: '',
            oauthUrl,
          }}
          mode="reconnect"
          existingAccountId={account.id}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  )
}
