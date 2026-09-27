import React, { useEffect } from 'react';
import { ArrowRight, Check, ShieldCheck, UserRoundPen, X } from 'lucide-react';

const ACTION_STYLES = {
  add: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  remove: 'bg-rose-50 text-rose-700 ring-rose-200',
  set: 'bg-sky-50 text-sky-700 ring-sky-200',
};

const ProfileApprovalDialog = ({
  approval,
  approvalId,
  isSubmitting,
  isEn,
  onApprove,
  onReject,
  onCancel,
}) => {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !isSubmitting) onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSubmitting, onCancel]);

  if (!approval) return null;

  const items = Array.isArray(approval.proposalItems) ? approval.proposalItems : [];
  const description = approval.description
    || (isEn
      ? 'The assistant found new profile information. Save it to your profile?'
      : '偵測到可更新的個人資料，是否要寫入？');

  return (
    <div
      className="absolute inset-0 z-[70] flex items-end justify-center bg-slate-900/40 p-3 backdrop-blur-[2px] animate-in fade-in duration-200 sm:items-center sm:p-6"
      onClick={() => { if (!isSubmitting) onCancel(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-approval-title"
        className="w-full max-w-md overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_80px_-20px_rgba(15,23,42,0.45)] animate-in fade-in slide-in-from-bottom-4 zoom-in-95 duration-200"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative px-6 pt-6">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            aria-label={isEn ? 'Close' : '關閉'}
            className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
          >
            <X size={16} />
          </button>

          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
              <UserRoundPen size={20} />
            </div>
            <div className="min-w-0 pr-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                Approval
              </p>
              <h3 id="profile-approval-title" className="mt-1 text-lg font-semibold text-slate-900">
                {isEn ? 'Confirm profile update' : '確認個人資料更新'}
              </h3>
              <p className="mt-1.5 text-sm leading-6 text-slate-600">{description}</p>
            </div>
          </div>
        </div>

        <div className="px-6 pt-5">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                Proposal
              </span>
              <span className="text-[11px] text-slate-400">
                {isEn ? `${items.length} change${items.length === 1 ? '' : 's'}` : `${items.length} 項變更`}
              </span>
            </div>

            {items.length > 0 ? (
              <ul className="max-h-60 divide-y divide-slate-200 overflow-y-auto">
                {items.map((item) => (
                  <li key={`${item.field}-${item.action}-${item.value}`} className="flex items-center gap-3 px-4 py-3">
                    <span className="w-16 shrink-0 text-sm font-medium text-slate-700">{item.label}</span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${ACTION_STYLES[item.action] || ACTION_STYLES.set}`}
                    >
                      {item.actionLabel}
                    </span>
                    <span className="flex min-w-0 flex-1 items-center justify-end gap-1.5 text-sm">
                      {item.currentValue && item.action === 'set' && (
                        <>
                          <span className="truncate text-slate-400 line-through decoration-slate-300">{item.currentValue}</span>
                          <ArrowRight size={13} className="shrink-0 text-slate-300" />
                        </>
                      )}
                      <span className={`break-all font-semibold ${item.action === 'remove' ? 'text-rose-600 line-through' : 'text-slate-900'}`}>
                        {item.value}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="whitespace-pre-line px-4 py-3 text-sm text-slate-600">{approval.prompt}</p>
            )}
          </div>

          {approvalId ? (
            <p className="mt-2.5 truncate font-mono text-[10px] text-slate-400">approval_id: {approvalId}</p>
          ) : (
            <p className="mt-2.5 text-xs text-rose-500">{isEn ? 'Missing approval_id.' : '缺少 approval_id。'}</p>
          )}
        </div>

        <div className="mt-4 flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/60 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="hidden items-center gap-1.5 text-[11px] text-slate-400 sm:flex">
            <ShieldCheck size={13} />
            {isEn ? 'Nothing is saved until you approve.' : '同意前不會寫入任何資料'}
          </p>
          <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="rounded-xl px-3.5 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
            >
              {isEn ? 'Later' : '稍後'}
            </button>
            <button
              type="button"
              onClick={onReject}
              disabled={isSubmitting || !approvalId}
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
            >
              {isEn ? 'Reject' : '拒絕'}
            </button>
            <button
              type="button"
              onClick={onApprove}
              disabled={isSubmitting || !approvalId}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              ) : (
                <Check size={15} />
              )}
              {isSubmitting ? (isEn ? 'Saving...' : '寫入中...') : (isEn ? 'Approve' : '同意')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileApprovalDialog;
