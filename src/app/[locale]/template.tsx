// A template (unlike a layout) re-mounts on every navigation, which restarts this short fade so
// route changes feel like a native screen transition instead of an instant swap.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
