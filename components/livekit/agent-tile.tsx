import { type AgentState, BarVisualizer, type TrackReference } from '@livekit/components-react';
import { cn } from '@/lib/utils';

interface AgentAudioTileProps {
  state: AgentState;
  audioTrack: TrackReference;
  className?: string;
}

export const AgentTile = ({
  state,
  audioTrack,
  className,
  ref,
}: React.ComponentProps<'div'> & AgentAudioTileProps) => {
  return (
    <div ref={ref} className={cn(className)}>
      <BarVisualizer
        barCount={5}
        state={state}
        options={{ minHeight: 2 }}
        trackRef={audioTrack}
        className={cn('flex aspect-video w-16 items-center justify-center gap-0.5')}
      >
        <span
          className={cn([
            'bg-muted min-h-1 w-1 rounded-full',
            'origin-center transition-colors duration-250 ease-linear',
            'data-[lk-highlighted=true]:bg-foreground data-[lk-muted=true]:bg-muted',
          ])}
        />
      </BarVisualizer>
    </div>
  );
};
