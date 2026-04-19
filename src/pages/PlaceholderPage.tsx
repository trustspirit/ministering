export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      <p className="text-slate-500 text-sm">후속 Plan에서 구현됩니다.</p>
    </div>
  );
}
