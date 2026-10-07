'use client';

import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';

interface GoogleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (email: string) => void;
}

const MOCK_ACCOUNTS = [
  { name: 'Harshitha S B', email: 'sbharshitha0109@gmail.com', avatar: 'https://ui-avatars.com/api/?name=Harshitha+S+B&background=27272a&color=fff' },
  { name: 'Harshitha SB', email: 'harshitha.sb30@gmail.com', avatar: 'https://ui-avatars.com/api/?name=Harshitha+SB&background=10b981&color=fff' },
  { name: 'Harshitha sb', email: 'harshitha.sb3526@gmail.com', avatar: 'https://ui-avatars.com/api/?name=Harshitha+sb&background=3b82f6&color=fff' },
];

export default function GoogleAuthModal({ isOpen, onClose, onSuccess }: GoogleAuthModalProps) {
  const [loadingEmail, setLoadingEmail] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelect = (email: string) => {
    setLoadingEmail(email);
    setTimeout(() => {
      setLoadingEmail(null);
      onSuccess(email);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-2xl shadow-2xl p-8 relative animate-in zoom-in-95 duration-200">
        
        {/* Google Header */}
        <div className="flex flex-col items-center mb-6">
          <svg className="w-10 h-10 mb-4" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Sign in with Google</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">Choose an account to continue to Nexora</p>
        </div>

        {/* Account List */}
        <div className="space-y-2">
          {MOCK_ACCOUNTS.map((account) => (
            <button
              key={account.email}
              onClick={() => handleSelect(account.email)}
              disabled={!!loadingEmail}
              className="w-full flex items-center justify-between p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer text-left disabled:opacity-50"
            >
              <div className="flex items-center space-x-3">
                <img src={account.avatar} alt={account.name} className="w-10 h-10 rounded-full" />
                <div>
                  <div className="text-sm font-bold text-zinc-900 dark:text-white">{account.name}</div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">{account.email}</div>
                </div>
              </div>
              {loadingEmail === account.email && (
                <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
              )}
            </button>
          ))}
          
          <button
            onClick={() => handleSelect('new_user@gmail.com')}
            disabled={!!loadingEmail}
            className="w-full flex items-center space-x-3 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer text-left disabled:opacity-50 mt-4"
          >
            <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
              <svg className="w-5 h-5 text-zinc-600 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <div className="text-sm font-bold text-zinc-900 dark:text-white">Use another account</div>
          </button>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end">
          <button
            onClick={onClose}
            disabled={!!loadingEmail}
            className="text-sm font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
