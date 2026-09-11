import React from 'react';
import { Globe } from 'lucide-react';
import { useLanguage } from '@/i18n';

export default function LanguageSwitcher({ className = '', variant = 'pill' }) {
  const { language, setLanguage, t } = useLanguage();

  if (variant === 'button') {
    const nextLang = language === 'zh' ? 'en' : 'zh';
    return (
      <button
        type="button"
        onClick={() => setLanguage(nextLang)}
        className={`inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50 hover:text-slate-900 ${className}`}
        title={t('common.switchLanguage')}
      >
        <Globe size={14} className="text-slate-500" />
        <span>{language === 'zh' ? 'English' : '繁體中文'}</span>
      </button>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-xl border border-slate-200/80 bg-slate-100/80 p-0.5 text-xs font-bold ${className}`}
      role="group"
      aria-label={t('common.switchLanguage')}
    >
      <div className="pl-1.5 pr-0.5 text-slate-400">
        <Globe size={13} />
      </div>
      <button
        type="button"
        onClick={() => setLanguage('zh')}
        className={`rounded-lg px-2 py-1 transition-all ${
          language === 'zh'
            ? 'bg-white text-slate-900 shadow-xs'
            : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        繁中
      </button>
      <button
        type="button"
        onClick={() => setLanguage('en')}
        className={`rounded-lg px-2 py-1 transition-all ${
          language === 'en'
            ? 'bg-white text-slate-900 shadow-xs'
            : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        EN
      </button>
    </div>
  );
}
