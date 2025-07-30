import { Button } from '@/components/ui/button';

interface WelcomeProps {
  disabled: boolean;
  startButtonText: string;
  onStartCall: () => void;
}

export const Welcome = ({
  disabled,
  startButtonText,
  onStartCall,
  ref,
}: React.ComponentProps<'div'> & WelcomeProps) => {
  return (
    <div
      ref={ref}
      inert={disabled}
      className="fixed inset-0 z-10 mx-auto flex h-svh flex-col items-center justify-center text-center"
    >
      <img src="/lk-logo.svg" alt="Logo" className="w-[20rem] dark:hidden" />
      <img src="/lk-logo-dark.svg" alt="Logo" className="w-[20rem] hidden dark:block" />


      <p className="text-fg1 max-w-prose pt-3 leading-6 font-medium">
        Chat live with <strong>Meshkat<span style={{ color: 'red' }}> AI</span></strong> agent
      </p>
      <Button variant="primary" size="lg" onClick={onStartCall} className="mt-6 w-64 font-mono">
        {startButtonText}
      </Button>
    </div>
  );
};
