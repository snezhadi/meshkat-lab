'use client';

import { type RefObject, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

export function useAutoScroll(scrollContentContainerRef: RefObject<Element | null>) {
  useEffect(() => {
    function scrollToBottom(force = false) {
      const el = scrollContentContainerRef.current as HTMLElement | null;
      if (!el) return;
      const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 10;
      // Only auto-scroll if forced or if user is very close to bottom
      if (force || isAtBottom) {
        // Add a small delay to prevent interference with manual scrolling
        setTimeout(() => {
          el.scrollTop = el.scrollHeight;
        }, 50);
      }
    }

    if (scrollContentContainerRef.current) {
      const resizeObserver = new ResizeObserver(() => scrollToBottom());
      resizeObserver.observe(scrollContentContainerRef.current);
      // Always scroll to bottom on mount
      scrollToBottom(true);
      return () => resizeObserver.disconnect();
    }
  }, [scrollContentContainerRef]);
}
interface ChatProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  className?: string;
}

export const ChatMessageView = ({ className, children, ...props }: ChatProps) => {
  const scrollContentRef = useRef<HTMLDivElement>(null);

  useAutoScroll(scrollContentRef);

  return (
    <div ref={scrollContentRef} className={cn('flex flex-col justify-end', className)} {...props}>
      {children}
    </div>
  );
};
