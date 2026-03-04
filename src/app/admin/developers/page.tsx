import DeveloperList from './DeveloperList';

export default async function DevelopersPage() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/api/developers`,
    { cache: 'no-store' }
  );

  if (!res.ok) {
    return (
      <div className="p-8">
        <p className="text-red-400 text-sm">Failed to load developers.</p>
      </div>
    );
  }

  const developers = await res.json();

  return <DeveloperList developers={developers ?? []} />;
}
