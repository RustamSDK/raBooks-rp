import React from 'react';

export type ProviderCategory = 'upi' | 'bank' | 'card' | 'wallet' | 'cash' | 'cheque' | 'other';

export interface ProviderDefinition {
  readonly id: string;
  readonly category: ProviderCategory;
  readonly displayName: string;
  readonly shortName: string;
  readonly aliases: readonly string[];
  readonly brandColor: string;
  readonly textColor: string;
  readonly country?: 'IN' | 'SA' | 'GLOBAL';
  readonly renderIcon: (props: { size?: number; className?: string }) => React.ReactElement;
}

// Crisp, high-contrast SVG Vector Icons matching official brand identities
export const PROVIDER_REGISTRY: Record<string, ProviderDefinition> = {
  // --- UPI PROVIDERS ---
  phonepe: {
    id: 'phonepe',
    category: 'upi',
    displayName: 'PhonePe',
    shortName: 'PhonePe',
    aliases: ['phonepe', 'phone pe', 'ppe', 'ybl', 'ibl', 'axl'],
    brandColor: '#5f259f',
    textColor: '#ffffff',
    country: 'IN',
    renderIcon: ({ size = 20, className = '' }) => (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-label="PhonePe">
        <rect width="32" height="32" rx="7" fill="#5f259f" />
        <path
          d="M17.8 7H14.2C10.8 7 9 9 9 12.5V23C9 23.6 9.4 24 10 24H13C13.6 24 14 23.6 14 23V19H17.8C21.5 19 23.5 17 23.5 13C23.5 9 21.5 7 17.8 7ZM17.2 15H14V11H17.2C18.6 11 19.5 11.7 19.5 13C19.5 14.3 18.6 15 17.2 15Z"
          fill="#ffffff"
        />
        <circle cx="21" cy="22" r="2.5" fill="#ffffff" />
      </svg>
    ),
  },

  gpay: {
    id: 'gpay',
    category: 'upi',
    displayName: 'Google Pay',
    shortName: 'GPay',
    aliases: ['gpay', 'google pay', 'googlepay', 'okaxis', 'okhdfcbank', 'okicici', 'oksbi'],
    brandColor: '#ffffff',
    textColor: '#1f2937',
    country: 'GLOBAL',
    renderIcon: ({ size = 20, className = '' }) => (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-label="Google Pay">
        <rect width="32" height="32" rx="7" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
        <path d="M13.5 10H10C8.3 10 7 11.3 7 13V19C7 20.7 8.3 22 10 22H13.5C15.2 22 16.5 20.7 16.5 19V13C16.5 11.3 15.2 10 13.5 10Z" fill="#4285F4" />
        <path d="M19 13C17.3 13 16 14.3 16 16C16 17.7 17.3 19 19 19H22C23.7 19 25 17.7 25 16C25 14.3 23.7 13 22 13H19Z" fill="#34A853" />
        <circle cx="16" cy="16" r="3" fill="#FBBC05" />
        <path d="M16 16H22V19H16V16Z" fill="#EA4335" />
      </svg>
    ),
  },

  paytm: {
    id: 'paytm',
    category: 'upi',
    displayName: 'Paytm',
    shortName: 'Paytm',
    aliases: ['paytm', 'paytm payments bank', 'paytmupi'],
    brandColor: '#002970',
    textColor: '#ffffff',
    country: 'IN',
    renderIcon: ({ size = 20, className = '' }) => (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-label="Paytm">
        <rect width="32" height="32" rx="7" fill="#002970" />
        <path d="M7 11H12.5C14.4 11 16 12.3 16 14C16 15.7 14.4 17 12.5 17H9.5V21H7V11ZM9.5 15H12.5C13.1 15 13.5 14.6 13.5 14C13.5 13.4 13.1 13 12.5 13H9.5V15Z" fill="#ffffff" />
        <path d="M17 14H19.5V21H22V14H24.5V12H17V14Z" fill="#00BAF2" />
      </svg>
    ),
  },

  bhim: {
    id: 'bhim',
    category: 'upi',
    displayName: 'BHIM UPI',
    shortName: 'BHIM',
    aliases: ['bhim', 'bhim upi', 'npci', 'upi'],
    brandColor: '#005f73',
    textColor: '#ffffff',
    country: 'IN',
    renderIcon: ({ size = 20, className = '' }) => (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-label="BHIM">
        <rect width="32" height="32" rx="7" fill="#084298" />
        <path d="M11 7L16 16L11 25H16L21 16L16 7H11Z" fill="#00D09C" />
        <path d="M17 7L22 16L17 25H21L26 16L21 7H17Z" fill="#FF8C00" />
      </svg>
    ),
  },

  amazonpay: {
    id: 'amazonpay',
    category: 'upi',
    displayName: 'Amazon Pay',
    shortName: 'Amazon Pay',
    aliases: ['amazon pay', 'amazonpay', 'apl'],
    brandColor: '#232f3e',
    textColor: '#ffffff',
    country: 'GLOBAL',
    renderIcon: ({ size = 20, className = '' }) => (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-label="Amazon Pay">
        <rect width="32" height="32" rx="7" fill="#232f3e" />
        <path d="M8 17C12 21 20 21 24 17" stroke="#FF9900" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M21 16L24 17.5L23.5 14" stroke="#FF9900" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="13" cy="11.5" r="2" fill="#ffffff" />
        <circle cx="19" cy="11.5" r="2" fill="#ffffff" />
      </svg>
    ),
  },

  cred: {
    id: 'cred',
    category: 'upi',
    displayName: 'CRED',
    shortName: 'CRED',
    aliases: ['cred', 'cred pay'],
    brandColor: '#121212',
    textColor: '#ffffff',
    country: 'IN',
    renderIcon: ({ size = 20, className = '' }) => (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-label="CRED">
        <rect width="32" height="32" rx="7" fill="#121212" />
        <circle cx="16" cy="16" r="8" stroke="#ffffff" strokeWidth="2.2" strokeDasharray="3 3" />
        <circle cx="16" cy="16" r="3.5" fill="#ffffff" />
      </svg>
    ),
  },

  whatsapppay: {
    id: 'whatsapppay',
    category: 'upi',
    displayName: 'WhatsApp Pay',
    shortName: 'WhatsApp',
    aliases: ['whatsapp', 'whatsapp pay', 'wa pay', 'wa'],
    brandColor: '#25D366',
    textColor: '#ffffff',
    country: 'GLOBAL',
    renderIcon: ({ size = 20, className = '' }) => (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-label="WhatsApp Pay">
        <rect width="32" height="32" rx="7" fill="#25D366" />
        <path
          d="M16 7C11 7 7 11 7 16C7 17.7 7.5 19.3 8.3 20.7L7 25L11.5 23.8C12.8 24.6 14.4 25 16 25C21 25 25 21 25 16C25 11 21 7 16 7ZM20.4 19.3C20.1 20 18.9 20.7 18.3 20.8C17.7 20.9 17 21 14.5 19.9C11.5 18.6 9.6 15.6 9.4 15.4C9.3 15.2 8.2 13.8 8.2 12.3C8.2 10.8 9 10 9.3 9.7C9.6 9.4 10 9.3 10.3 9.3C10.5 9.3 10.7 9.3 10.9 9.3C11.2 9.3 11.4 9.4 11.6 9.8C11.8 10.3 12.3 11.5 12.4 11.6C12.5 11.7 12.5 11.9 12.4 12.1C12.3 12.3 12.2 12.4 12 12.6C11.9 12.8 11.7 13 11.5 13.2C11.4 13.4 11.2 13.6 11.4 13.9C11.6 14.3 12.3 15.4 13.4 16.4C14.8 17.6 15.9 18 16.3 18.2C16.6 18.3 16.9 18.3 17.1 18.1C17.3 17.8 17.8 17.2 18.1 16.8C18.3 16.5 18.6 16.5 18.9 16.6C19.2 16.7 20.8 17.5 21.1 17.6C21.4 17.8 21.6 17.9 21.7 18C21.8 18.3 21.8 19.1 20.4 19.3Z"
          fill="#ffffff"
        />
      </svg>
    ),
  },

  mobikwik: {
    id: 'mobikwik',
    category: 'upi',
    displayName: 'MobiKwik',
    shortName: 'MobiKwik',
    aliases: ['mobikwik', 'mobi kwik', 'ikwik'],
    brandColor: '#008ae0',
    textColor: '#ffffff',
    country: 'IN',
    renderIcon: ({ size = 20, className = '' }) => (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-label="MobiKwik">
        <rect width="32" height="32" rx="7" fill="#008ae0" />
        <path d="M10 22V10L16 16L22 10V22" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },

  freecharge: {
    id: 'freecharge',
    category: 'upi',
    displayName: 'Freecharge',
    shortName: 'Freecharge',
    aliases: ['freecharge', 'free charge'],
    brandColor: '#ff5722',
    textColor: '#ffffff',
    country: 'IN',
    renderIcon: ({ size = 20, className = '' }) => (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-label="Freecharge">
        <rect width="32" height="32" rx="7" fill="#ff5722" />
        <path d="M18 7L11 17H16L14 25L21 15H16L18 7Z" fill="#ffffff" />
      </svg>
    ),
  },

  // --- MAJOR BANKS (INDIA) ---
  sbi: {
    id: 'sbi',
    category: 'bank',
    displayName: 'State Bank of India',
    shortName: 'SBI',
    aliases: ['sbi', 'state bank of india', 'state bank', 'sbi inb', 'sbi upi'],
    brandColor: '#280071',
    textColor: '#ffffff',
    country: 'IN',
    renderIcon: ({ size = 20, className = '' }) => (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-label="SBI">
        <rect width="32" height="32" rx="7" fill="#280071" />
        <circle cx="16" cy="14" r="7" fill="#00a5df" />
        <rect x="14.8" y="14" width="2.4" height="10" fill="#280071" />
        <circle cx="16" cy="14" r="2.5" fill="#280071" />
      </svg>
    ),
  },

  hdfc: {
    id: 'hdfc',
    category: 'bank',
    displayName: 'HDFC Bank',
    shortName: 'HDFC',
    aliases: ['hdfc', 'hdfc bank', 'housing development finance corporation'],
    brandColor: '#004c8f',
    textColor: '#ffffff',
    country: 'IN',
    renderIcon: ({ size = 20, className = '' }) => (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-label="HDFC Bank">
        <rect width="32" height="32" rx="7" fill="#004c8f" />
        <rect x="7" y="7" width="18" height="18" fill="#ED232A" />
        <rect x="10" y="10" width="12" height="12" fill="#ffffff" />
        <rect x="13.5" y="7" width="5" height="18" fill="#004c8f" />
        <rect x="7" y="13.5" width="18" height="5" fill="#004c8f" />
        <rect x="13" y="13" width="6" height="6" fill="#004c8f" />
      </svg>
    ),
  },

  icici: {
    id: 'icici',
    category: 'bank',
    displayName: 'ICICI Bank',
    shortName: 'ICICI',
    aliases: ['icici', 'icici bank'],
    brandColor: '#b02a30',
    textColor: '#ffffff',
    country: 'IN',
    renderIcon: ({ size = 20, className = '' }) => (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-label="ICICI Bank">
        <rect width="32" height="32" rx="7" fill="#8B1D24" />
        <path d="M16 8C11.6 8 8 11.6 8 16C8 20.4 11.6 24 16 24C19 24 21.6 22.3 22.8 19.8H18.8C18 20.8 17.1 21.4 16 21.4C13 21.4 10.6 19 10.6 16C10.6 13 13 10.6 16 10.6C17.5 10.6 18.8 11.3 19.6 12.4L22.6 9.8C20.9 8.7 18.6 8 16 8Z" fill="#F37024" />
        <circle cx="21" cy="16" r="3.2" fill="#ffffff" />
      </svg>
    ),
  },

  axis: {
    id: 'axis',
    category: 'bank',
    displayName: 'Axis Bank',
    shortName: 'Axis',
    aliases: ['axis', 'axis bank', 'uti bank'],
    brandColor: '#97144d',
    textColor: '#ffffff',
    country: 'IN',
    renderIcon: ({ size = 20, className = '' }) => (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-label="Axis Bank">
        <rect width="32" height="32" rx="7" fill="#97144d" />
        <path d="M16 8L25 24H19.5L16 17.5L12.5 24H7L16 8Z" fill="#ffffff" />
        <path d="M16 12.5L19.2 18.5H12.8L16 12.5Z" fill="#97144d" />
      </svg>
    ),
  },

  kotak: {
    id: 'kotak',
    category: 'bank',
    displayName: 'Kotak Mahindra Bank',
    shortName: 'Kotak',
    aliases: ['kotak', 'kotak mahindra', 'kotak bank'],
    brandColor: '#ed1c24',
    textColor: '#ffffff',
    country: 'IN',
    renderIcon: ({ size = 20, className = '' }) => (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-label="Kotak">
        <rect width="32" height="32" rx="7" fill="#ed1c24" />
        <path d="M10 9H13.5V14.5L19 9H23.5L16.5 16L24 23H19.2L13.5 17.5V23H10V9Z" fill="#ffffff" />
      </svg>
    ),
  },

  pnb: {
    id: 'pnb',
    category: 'bank',
    displayName: 'Punjab National Bank',
    shortName: 'PNB',
    aliases: ['pnb', 'punjab national bank'],
    brandColor: '#a20034',
    textColor: '#ffffff',
    country: 'IN',
    renderIcon: ({ size = 20, className = '' }) => (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-label="PNB">
        <rect width="32" height="32" rx="7" fill="#a20034" />
        <circle cx="16" cy="16" r="7.5" fill="#fdb813" />
        <circle cx="16" cy="16" r="4.5" fill="#a20034" />
      </svg>
    ),
  },

  bob: {
    id: 'bob',
    category: 'bank',
    displayName: 'Bank of Baroda',
    shortName: 'Baroda',
    aliases: ['bank of baroda', 'bob', 'baroda bank'],
    brandColor: '#f26522',
    textColor: '#ffffff',
    country: 'IN',
    renderIcon: ({ size = 20, className = '' }) => (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-label="Bank of Baroda">
        <rect width="32" height="32" rx="7" fill="#f26522" />
        <circle cx="16" cy="16" r="7" stroke="#ffffff" strokeWidth="2.5" />
        <path d="M16 11V16L19.5 19.5" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    ),
  },

  canara: {
    id: 'canara',
    category: 'bank',
    displayName: 'Canara Bank',
    shortName: 'Canara',
    aliases: ['canara', 'canara bank'],
    brandColor: '#0090d0',
    textColor: '#ffffff',
    country: 'IN',
    renderIcon: ({ size = 20, className = '' }) => (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-label="Canara Bank">
        <rect width="32" height="32" rx="7" fill="#0090d0" />
        <path d="M16 8L23 23H9L16 8Z" fill="#ffcb05" />
        <circle cx="16" cy="18" r="2.5" fill="#0090d0" />
      </svg>
    ),
  },

  unionbank: {
    id: 'unionbank',
    category: 'bank',
    displayName: 'Union Bank of India',
    shortName: 'Union Bank',
    aliases: ['union bank', 'ubi', 'union bank of india'],
    brandColor: '#004a80',
    textColor: '#ffffff',
    country: 'IN',
    renderIcon: ({ size = 20, className = '' }) => (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-label="Union Bank">
        <rect width="32" height="32" rx="7" fill="#004a80" />
        <path d="M10 10V18C10 21.3 12.7 24 16 24C19.3 24 22 21.3 22 18V10H18V18C18 19.1 17.1 20 16 20C14.9 20 14 19.1 14 18V10H10Z" fill="#e31e24" />
      </svg>
    ),
  },

  // --- CARDS & NETWORKS ---
  visa: {
    id: 'visa',
    category: 'card',
    displayName: 'Visa',
    shortName: 'Visa',
    aliases: ['visa', 'visacard'],
    brandColor: '#1a1f71',
    textColor: '#ffffff',
    country: 'GLOBAL',
    renderIcon: ({ size = 20, className = '' }) => (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-label="Visa">
        <rect width="32" height="32" rx="7" fill="#1a1f71" />
        <path d="M7 21L10.5 11H13.2L9.7 21H7Z" fill="#ffffff" />
        <path d="M14 21L16 11H18.5L16.5 21H14Z" fill="#ffffff" />
        <path d="M24 11.2C23.5 11 22.5 10.8 21.3 10.8C18.5 10.8 16.5 12.2 16.5 14.3C16.5 15.9 18 16.7 19.1 17.2C20.2 17.7 20.6 18 20.6 18.6C20.6 19.4 19.6 19.8 18.7 19.8C17.4 19.8 16.6 19.5 16 19.2L15.6 21.2C16.3 21.5 17.6 21.8 18.9 21.8C22 21.8 23.9 20.3 23.9 18.1C23.9 16.4 22.8 15.1 20.6 14C19.7 13.5 19.2 13.2 19.2 12.6C19.2 12.1 19.8 11.6 21 11.6C22 11.6 22.8 11.8 23.3 12L24 11.2Z" fill="#f7b600" />
      </svg>
    ),
  },

  mastercard: {
    id: 'mastercard',
    category: 'card',
    displayName: 'Mastercard',
    shortName: 'Mastercard',
    aliases: ['mastercard', 'master card', 'mc'],
    brandColor: '#222222',
    textColor: '#ffffff',
    country: 'GLOBAL',
    renderIcon: ({ size = 20, className = '' }) => (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-label="Mastercard">
        <rect width="32" height="32" rx="7" fill="#1e293b" />
        <circle cx="12.5" cy="16" r="6.5" fill="#eb001b" />
        <circle cx="19.5" cy="16" r="6.5" fill="#f79e1b" fillOpacity="0.9" />
      </svg>
    ),
  },

  rupay: {
    id: 'rupay',
    category: 'card',
    displayName: 'RuPay',
    shortName: 'RuPay',
    aliases: ['rupay', 'rupay card', 'npci rupay'],
    brandColor: '#0a3a60',
    textColor: '#ffffff',
    country: 'IN',
    renderIcon: ({ size = 20, className = '' }) => (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-label="RuPay">
        <rect width="32" height="32" rx="7" fill="#0b3b60" />
        <path d="M8 10L14 16L8 22H12L18 16L12 10H8Z" fill="#008060" />
        <path d="M15 10L21 16L15 22H19L25 16L19 10H15Z" fill="#ff6600" />
      </svg>
    ),
  },

  amex: {
    id: 'amex',
    category: 'card',
    displayName: 'American Express',
    shortName: 'Amex',
    aliases: ['amex', 'american express'],
    brandColor: '#002663',
    textColor: '#ffffff',
    country: 'GLOBAL',
    renderIcon: ({ size = 20, className = '' }) => (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-label="American Express">
        <rect width="32" height="32" rx="7" fill="#002663" />
        <path d="M7 11H11.5L13.5 16L15.5 11H20L21 13.5L22 11H25V21H22V18.5L21 21H19L18 18.5V21H13.5L11.5 16L9.5 21H7V11Z" fill="#00a3e0" />
      </svg>
    ),
  },

  // --- SAUDI PAYMENT & BANKING ECOSYSTEM ---
  mada: {
    id: 'mada',
    category: 'card',
    displayName: 'mada',
    shortName: 'mada',
    aliases: ['mada', 'mada pay', 'madapay', 'مدى'],
    brandColor: '#007a3d',
    textColor: '#ffffff',
    country: 'SA',
    renderIcon: ({ size = 20, className = '' }) => (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-label="mada">
        <rect width="32" height="32" rx="7" fill="#007a3d" />
        <path d="M8 19L11 11H13.5L16 16.5L18.5 11H21L24 19H21.5L20 15L17.5 20H14.5L12 15L10.5 19H8Z" fill="#8dc63f" />
        <circle cx="16" cy="10" r="1.8" fill="#ffffff" />
      </svg>
    ),
  },

  stcpay: {
    id: 'stcpay',
    category: 'wallet',
    displayName: 'stc pay',
    shortName: 'stc pay',
    aliases: ['stc pay', 'stcpay', 'stc', 'urpay', 'ur pay'],
    brandColor: '#4f008c',
    textColor: '#ffffff',
    country: 'SA',
    renderIcon: ({ size = 20, className = '' }) => (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-label="stc pay">
        <rect width="32" height="32" rx="7" fill="#4f008c" />
        <path d="M10 13C10 11.3 11.3 10 13 10H19C20.7 10 22 11.3 22 13V15H14C12.9 15 12 15.9 12 17C12 18.1 12.9 19 14 19H22V20C22 21.7 20.7 23 19 23H13C11.3 23 10 21.7 10 20V13Z" fill="#ff375e" />
        <circle cx="18" cy="17" r="1.5" fill="#ffffff" />
      </svg>
    ),
  },

  snb: {
    id: 'snb',
    category: 'bank',
    displayName: 'Saudi National Bank',
    shortName: 'SNB / الأهلي',
    aliases: ['snb', 'saudi national bank', 'alahli', 'ncb', 'البنك الأهلي'],
    brandColor: '#005a36',
    textColor: '#ffffff',
    country: 'SA',
    renderIcon: ({ size = 20, className = '' }) => (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-label="SNB">
        <rect width="32" height="32" rx="7" fill="#005a36" />
        <path d="M16 8L23 20H9L16 8Z" fill="#ffffff" />
        <path d="M16 12L20 19H12L16 12Z" fill="#005a36" />
        <circle cx="16" cy="22" r="1.5" fill="#c3a35b" />
      </svg>
    ),
  },

  alrajhi: {
    id: 'alrajhi',
    category: 'bank',
    displayName: 'Al Rajhi Bank',
    shortName: 'Al Rajhi / الراجحي',
    aliases: ['al rajhi', 'alrajhi', 'rajhi bank', 'مصرف الراجحي'],
    brandColor: '#002554',
    textColor: '#ffffff',
    country: 'SA',
    renderIcon: ({ size = 20, className = '' }) => (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-label="Al Rajhi">
        <rect width="32" height="32" rx="7" fill="#002554" />
        <path d="M10 11C10 9.3 11.3 8 13 8H19C20.7 8 22 9.3 22 11V21C22 22.7 20.7 24 19 24H13C11.3 24 10 22.7 10 21V11Z" fill="#0072ce" />
        <path d="M13 12H19V20H13V12Z" fill="#ffffff" />
      </svg>
    ),
  },

  riyadbank: {
    id: 'riyadbank',
    category: 'bank',
    displayName: 'Riyad Bank',
    shortName: 'Riyad Bank',
    aliases: ['riyad', 'riyad bank', 'بنك الرياض'],
    brandColor: '#006a4e',
    textColor: '#ffffff',
    country: 'SA',
    renderIcon: ({ size = 20, className = '' }) => (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-label="Riyad Bank">
        <rect width="32" height="32" rx="7" fill="#006a4e" />
        <circle cx="16" cy="16" r="7.5" stroke="#fdb813" strokeWidth="2.5" />
        <circle cx="16" cy="16" r="3.5" fill="#ffffff" />
      </svg>
    ),
  },

  // --- GLOBAL WALLETS ---
  paypal: {
    id: 'paypal',
    category: 'wallet',
    displayName: 'PayPal',
    shortName: 'PayPal',
    aliases: ['paypal', 'pp'],
    brandColor: '#003087',
    textColor: '#ffffff',
    country: 'GLOBAL',
    renderIcon: ({ size = 20, className = '' }) => (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-label="PayPal">
        <rect width="32" height="32" rx="7" fill="#003087" />
        <path d="M13 8H19C21.2 8 23 9.8 23 12C23 14.2 21.2 16 19 16H15.5L14 24H10L13 8Z" fill="#0079C1" />
        <path d="M16 12H21C22.7 12 24 13.3 24 15C24 16.7 22.7 18 21 18H18.5L17.5 24H14.5L16 12Z" fill="#00457C" fillOpacity="0.8" />
      </svg>
    ),
  },

  stripe: {
    id: 'stripe',
    category: 'wallet',
    displayName: 'Stripe',
    shortName: 'Stripe',
    aliases: ['stripe'],
    brandColor: '#635bff',
    textColor: '#ffffff',
    country: 'GLOBAL',
    renderIcon: ({ size = 20, className = '' }) => (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-label="Stripe">
        <rect width="32" height="32" rx="7" fill="#635bff" />
        <path d="M18.5 13.5C18.5 12.4 17.6 11.5 16 11.5C14.2 11.5 12.8 12.3 12.5 13.5L10.5 12.7C11.1 10.9 13.2 9.5 16 9.5C19.2 9.5 21.2 11.1 21.2 13.6C21.2 17.5 15.6 16.8 15.6 19C15.6 19.9 16.4 20.5 17.8 20.5C19.5 20.5 21 19.7 21.4 18.5L23.4 19.3C22.7 21.2 20.5 22.5 17.7 22.5C14.3 22.5 12.8 20.6 12.8 18.2C12.8 14.5 18.5 15.1 18.5 13.5Z" fill="#ffffff" />
      </svg>
    ),
  },

  wise: {
    id: 'wise',
    category: 'wallet',
    displayName: 'Wise',
    shortName: 'Wise',
    aliases: ['wise', 'transferwise'],
    brandColor: '#9fe870',
    textColor: '#163300',
    country: 'GLOBAL',
    renderIcon: ({ size = 20, className = '' }) => (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-label="Wise">
        <rect width="32" height="32" rx="7" fill="#163300" />
        <path d="M11 9L15 15L21 8H24L16.5 17.5L21 24H17.5L14 19L11 24H8L13 16.5L9 11L11 9Z" fill="#9fe870" />
      </svg>
    ),
  },

  // --- GENERIC CATEGORY FALLBACKS ---
  cash: {
    id: 'cash',
    category: 'cash',
    displayName: 'Cash',
    shortName: 'Cash',
    aliases: ['cash', 'currency', 'in-hand', 'cash in hand', 'physical cash', 'rokad'],
    brandColor: '#059669',
    textColor: '#ffffff',
    country: 'GLOBAL',
    renderIcon: ({ size = 20, className = '' }) => (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-label="Cash">
        <rect width="32" height="32" rx="7" fill="#059669" />
        <rect x="7" y="10" width="18" height="12" rx="2" stroke="#ffffff" strokeWidth="1.8" />
        <circle cx="16" cy="16" r="3" stroke="#ffffff" strokeWidth="1.8" />
        <circle cx="10" cy="16" r="1" fill="#ffffff" />
        <circle cx="22" cy="16" r="1" fill="#ffffff" />
      </svg>
    ),
  },

  cheque: {
    id: 'cheque',
    category: 'cheque',
    displayName: 'Cheque',
    shortName: 'Cheque',
    aliases: ['cheque', 'check', 'bank cheque', 'dd', 'demand draft'],
    brandColor: '#475569',
    textColor: '#ffffff',
    country: 'GLOBAL',
    renderIcon: ({ size = 20, className = '' }) => (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-label="Cheque">
        <rect width="32" height="32" rx="7" fill="#334155" />
        <rect x="7" y="10" width="18" height="12" rx="2" stroke="#ffffff" strokeWidth="1.8" />
        <line x1="10" y1="13" x2="16" y2="13" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="10" y1="16" x2="22" y2="16" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="16" y1="19" x2="22" y2="19" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },

  generic_upi: {
    id: 'generic_upi',
    category: 'upi',
    displayName: 'UPI Transfer',
    shortName: 'UPI',
    aliases: ['upi', 'vpa', 'instant payment', 'qr code', 'bhim upi general'],
    brandColor: '#0284c7',
    textColor: '#ffffff',
    country: 'IN',
    renderIcon: ({ size = 20, className = '' }) => (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-label="UPI">
        <rect width="32" height="32" rx="7" fill="#0284c7" />
        <path d="M12 9L18 16L12 23" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16 9L22 16L16 23" stroke="#93c5fd" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },

  generic_bank: {
    id: 'generic_bank',
    category: 'bank',
    displayName: 'Bank Transfer',
    shortName: 'Bank',
    aliases: ['bank', 'bank transfer', 'neft', 'rtgs', 'imps', 'wire', 'direct deposit', 'account transfer'],
    brandColor: '#1e3a8a',
    textColor: '#ffffff',
    country: 'GLOBAL',
    renderIcon: ({ size = 20, className = '' }) => (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-label="Bank Transfer">
        <rect width="32" height="32" rx="7" fill="#1e3a8a" />
        <path d="M7 13L16 8L25 13H7Z" fill="#ffffff" />
        <rect x="9" y="15" width="2" height="6" fill="#ffffff" />
        <rect x="13" y="15" width="2" height="6" fill="#ffffff" />
        <rect x="17" y="15" width="2" height="6" fill="#ffffff" />
        <rect x="21" y="15" width="2" height="6" fill="#ffffff" />
        <rect x="7" y="22" width="18" height="2" fill="#ffffff" />
      </svg>
    ),
  },

  generic_card: {
    id: 'generic_card',
    category: 'card',
    displayName: 'Card Payment',
    shortName: 'Card',
    aliases: ['card', 'credit card', 'debit card', 'pos', 'swipe'],
    brandColor: '#4f46e5',
    textColor: '#ffffff',
    country: 'GLOBAL',
    renderIcon: ({ size = 20, className = '' }) => (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-label="Card">
        <rect width="32" height="32" rx="7" fill="#4f46e5" />
        <rect x="7" y="10" width="18" height="12" rx="2" stroke="#ffffff" strokeWidth="1.8" />
        <line x1="7" y1="13.5" x2="25" y2="13.5" stroke="#ffffff" strokeWidth="2" />
        <rect x="10" y="17" width="4" height="2.5" fill="#fcd34d" />
      </svg>
    ),
  },

  generic_wallet: {
    id: 'generic_wallet',
    category: 'wallet',
    displayName: 'Digital Wallet',
    shortName: 'Wallet',
    aliases: ['wallet', 'e-wallet', 'digital wallet'],
    brandColor: '#7c3aed',
    textColor: '#ffffff',
    country: 'GLOBAL',
    renderIcon: ({ size = 20, className = '' }) => (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-label="Wallet">
        <rect width="32" height="32" rx="7" fill="#7c3aed" />
        <rect x="7" y="10" width="18" height="13" rx="2" stroke="#ffffff" strokeWidth="1.8" />
        <path d="M19 14.5H25V18.5H19C17.9 18.5 17 17.6 17 16.5C17 15.4 17.9 14.5 19 14.5Z" fill="#ffffff" />
        <circle cx="21" cy="16.5" r="1" fill="#7c3aed" />
      </svg>
    ),
  },
};

/**
 * Resolves any provider name, rail, or freeform alias into a known ProviderDefinition.
 * Falls back cleanly through:
 * 1. Exact alias match
 * 2. Method-based category fallback (Cash, UPI, Bank, Cheque, Card, Wallet)
 * 3. Default Cash fallback
 */
export function resolveProvider(
  providerQuery?: string | null,
  methodFallback?: string | null
): ProviderDefinition {
  const q = (providerQuery || '').trim().toLowerCase();

  if (q) {
    // 1. Direct ID match
    if (PROVIDER_REGISTRY[q]) {
      return PROVIDER_REGISTRY[q];
    }

    // 2. Alias lookup
    for (const p of Object.values(PROVIDER_REGISTRY)) {
      if (
        p.id.toLowerCase() === q ||
        p.displayName.toLowerCase() === q ||
        p.shortName.toLowerCase() === q ||
        p.aliases.some((alias) => alias.toLowerCase() === q || q.includes(alias.toLowerCase()))
      ) {
        return p;
      }
    }
  }

  // 3. Fallback to method parameter
  const m = (methodFallback || '').trim().toLowerCase();
  if (m === 'cash') return PROVIDER_REGISTRY.cash;
  if (m === 'upi') return PROVIDER_REGISTRY.generic_upi;
  if (m === 'bank' || m.includes('neft') || m.includes('rtgs') || m.includes('imps'))
    return PROVIDER_REGISTRY.generic_bank;
  if (m === 'cheque' || m === 'check' || m.includes('draft')) return PROVIDER_REGISTRY.cheque;
  if (m === 'card' || m.includes('pos')) return PROVIDER_REGISTRY.generic_card;
  if (m === 'wallet') return PROVIDER_REGISTRY.generic_wallet;

  return PROVIDER_REGISTRY.cash;
}
