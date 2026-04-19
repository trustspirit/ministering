import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <h1 className="text-3xl font-semibold mb-2">404</h1>
      <p className="text-slate-600 mb-4">페이지를 찾을 수 없습니다</p>
      <Link to="/" className="text-blue-600 hover:underline">대시보드로</Link>
    </div>
  );
}
