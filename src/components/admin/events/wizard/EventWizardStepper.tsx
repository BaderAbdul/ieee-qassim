'use client';

import { Check, Lock } from 'lucide-react';
import { STAGES, type StageId } from './wizardTypes';

interface EventWizardStepperProps {
  isAr: boolean;
  activeStage: StageId;
  completedStages: Set<StageId>;
  /** Stages 2+ need the event created by stage 1 first. */
  locked: boolean;
  onSelect: (stage: StageId) => void;
}

export default function EventWizardStepper({ isAr, activeStage, completedStages, locked, onSelect }: EventWizardStepperProps) {
  return (
    <nav aria-label={isAr ? 'مراحل إنشاء الفعالية' : 'Event creation stages'} className="overflow-x-auto pb-1">
      <ol className="flex min-w-max items-start gap-0">
        {STAGES.map((stage, index) => {
          const isActive = stage.id === activeStage;
          const isDone = completedStages.has(stage.id);
          const isLocked = index > 0 && locked;
          const disabled = isLocked;
          return (
            <li key={stage.id} className="flex items-center">
              {index > 0 && (
                <div
                  className="mt-5 h-0.5 w-8 sm:w-14"
                  style={{ backgroundColor: completedStages.has(STAGES[index - 1].id) ? 'var(--color-accent)' : 'var(--color-border)' }}
                />
              )}
              <button
                type="button"
                disabled={disabled}
                aria-current={isActive ? 'step' : undefined}
                title={!stage.implemented ? (isAr ? 'قريبًا' : 'Coming soon') : isLocked ? (isAr ? 'احفظ البيانات الأساسية أولاً' : 'Save main data first') : undefined}
                onClick={() => onSelect(stage.id)}
                className="flex flex-col items-center gap-1.5 px-1.5 text-center disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold"
                  style={{
                    borderColor: isActive ? 'var(--color-accent)' : isDone ? 'var(--color-accent)' : 'var(--color-border)',
                    backgroundColor: isActive ? 'var(--color-accent-soft)' : isDone ? 'var(--color-accent)' : 'var(--color-surface-2)',
                    color: isActive ? 'var(--color-accent)' : isDone ? 'var(--color-accent-contrast)' : 'var(--color-text-muted)',
                  }}
                >
                  {isLocked ? <Lock size={15} /> : isDone ? <Check size={16} /> : index + 1}
                </span>
                <span
                  className="w-20 text-[11px] font-bold leading-tight sm:w-24"
                  style={{ color: isActive ? 'var(--color-accent)' : 'var(--color-text-muted)' }}
                >
                  {isAr ? stage.labelAr : stage.labelEn}
                  {!stage.implemented && (
                    <span className="mt-0.5 block font-normal opacity-80">{isAr ? '(قريبًا)' : '(soon)'}</span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
