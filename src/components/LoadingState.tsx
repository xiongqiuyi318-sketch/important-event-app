import './LoadingState.css';

interface LoadingStateProps {
  message?: string;
}

export default function LoadingState({ message = '加载中...' }: LoadingStateProps) {
  return (
    <div className="loading-state">
      <div className="loading-spinner"></div>
      <p className="loading-message">{message}</p>
    </div>
  );
}

export function LoadingSkeleton() {
  return (
    <div className="loading-skeleton">
      {[1, 2, 3].map((i) => (
        <div key={i} className="skeleton-card">
          <div className="skeleton-header">
            <div className="skeleton-title"></div>
            <div className="skeleton-badge"></div>
          </div>
          <div className="skeleton-content">
            <div className="skeleton-line"></div>
            <div className="skeleton-line short"></div>
          </div>
        </div>
      ))}
    </div>
  );
}



