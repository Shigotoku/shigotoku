export default function PageLoader({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={
        compact
          ? 'flex items-center justify-center py-16'
          : 'flex min-h-[60vh] items-center justify-center'
      }
      aria-busy="true"
      aria-label="読み込み中"
    >
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
    </div>
  );
}
