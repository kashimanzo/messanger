export default function ApiHomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-3xl font-bold">Bulk Messanger API</h1>
      <p className="text-slate-600">
        This Next.js app serves tRPC and Better Auth endpoints.
      </p>
      <ul className="list-disc text-slate-700">
        <li>
          <code>/api/trpc</code> — tRPC routes
        </li>
        <li>
          <code>/api/auth</code> — Better Auth routes
        </li>
      </ul>
    </main>
  );
}
