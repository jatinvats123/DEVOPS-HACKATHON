import { Link } from 'react-router';

export default function NotFound() {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center px-4 text-center">
      <p className="text-sm font-medium tracking-widest text-zinc-500">404</p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
        Page not found
      </h1>
      <p className="mt-3 max-w-md text-[15px] leading-relaxed text-zinc-400">
        The page you are looking for might have been removed, renamed, or is
        temporarily unavailable.
      </p>
      <Link
        to="/"
        className="mt-8 rounded-md bg-white px-5 py-2.5 text-sm font-medium text-black transition-colors hover:bg-zinc-200"
      >
        Back to home
      </Link>
    </div>
  );
}
