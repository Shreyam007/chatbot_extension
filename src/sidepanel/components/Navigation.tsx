import React from 'react';
import {
  MessageSquare,
  Sparkles,
  GitBranch,
  BarChart3,
} from 'lucide-react';

export type SidePanelTab = 'chat' | 'hints' | 'trace' | 'progress';

export interface NavigationProps {
  activeTab: SidePanelTab;
  onTabChange: (tab: SidePanelTab) => void;
  chatBadgeCount?: number;
  hintsHasNew?: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  chatBadgeCount,
  hintsHasNew,
}) => {
  const tabs: Array<{ id: SidePanelTab; label: string; icon: React.ReactNode }> = [
    {
      id: 'chat',
      label: 'Chat',
      icon: <MessageSquare className="w-3.5 h-3.5" />,
    },
    {
      id: 'hints',
      label: 'Hints',
      icon: <Sparkles className="w-3.5 h-3.5" />,
    },
    {
      id: 'trace',
      label: 'Trace',
      icon: <GitBranch className="w-3.5 h-3.5" />,
    },
    {
      id: 'progress',
      label: 'Progress',
      icon: <BarChart3 className="w-3.5 h-3.5" />,
    },
  ];

  return (
    <nav
      role="tablist"
      aria-label="Side panel sections"
      className="flex border-b border-outline-variant/30 bg-surface-container-lowest shrink-0 select-none"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            aria-controls={`tabpanel-${tab.id}`}
            id={`tab-${tab.id}`}
            onClick={() => onTabChange(tab.id)}
            className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 text-xs font-mono transition-colors border-b-2 relative ${
              isActive
                ? 'border-primary text-primary bg-surface-container/40 font-semibold'
                : 'border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/30'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>

            {/* Notification Badge / Pill */}
            {tab.id === 'chat' && chatBadgeCount && chatBadgeCount > 0 ? (
              <span className="px-1.5 py-0.2 rounded-full bg-primary/20 text-primary text-[10px] font-mono leading-none">
                {chatBadgeCount}
              </span>
            ) : null}

            {tab.id === 'hints' && hintsHasNew && !isActive ? (
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            ) : null}
          </button>
        );
      })}
    </nav>
  );
};
