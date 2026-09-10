import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4 py-10">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-8 flex items-center justify-center gap-2 font-extrabold text-ink"
        >
          <span className="h-6 w-6 rounded-md bg-accent" aria-hidden />
          DataForGood
        </Link>
        {children}
      </div>
    </div>
  );
}
