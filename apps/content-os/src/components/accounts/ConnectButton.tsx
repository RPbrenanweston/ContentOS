'use client'

import { useState } from 'react'
import { ConnectModal } from './ConnectModal'

interface ConnectButtonProps {
  platform: {
    id: string
    label: string
    icon: string
    color: string
    oauthUrl: string
  }
}

export function ConnectButton({ platform }: ConnectButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        style={{
          background: '#CBFF53',
          color: '#000',
          fontSize: '0.75rem',
          fontWeight: 600,
          padding: '6px 0',
          borderRadius: 6,
          border: 'none',
          cursor: 'pointer',
          width: '100%',
        }}
      >
        Connect
      </button>
      {isOpen && (
        <ConnectModal
          platform={platform}
          mode="connect"
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  )
}
