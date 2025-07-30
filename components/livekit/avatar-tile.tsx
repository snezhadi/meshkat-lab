import { type TrackReference, VideoTrack } from '@livekit/components-react';
import { cn } from '@/lib/utils';

interface AgentAudioTileProps {
  videoTrack: TrackReference;
  className?: string;
  chatOpen?: boolean;
}

export const AvatarTile = ({
  videoTrack,
  className,
  chatOpen = false,
  ref,
}: React.ComponentProps<'div'> & AgentAudioTileProps) => {
  return (
    <div ref={ref} className={cn(className)}>
      <VideoTrack
        trackRef={videoTrack}
        width={videoTrack?.publication.dimensions?.width ?? 0}
        height={videoTrack?.publication.dimensions?.height ?? 0}
        className={cn(!chatOpen ? "rounded-md" : "rounded-lg")}
      />
    </div>
  );
};
