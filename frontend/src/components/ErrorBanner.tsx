export default function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="banner error" role="alert">
      <span>{message}</span>
      {onRetry && <button className="btn small" onClick={onRetry}>Try again</button>}
    </div>
  );
}
