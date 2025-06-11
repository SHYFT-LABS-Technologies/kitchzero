export default function Home() {
  return (
    <main className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-text mb-4">
          Welcome to KitchZero
        </h1>
        <p className="text-lg text-text/80">
          Food waste reduction platform for restaurants
        </p>
        <div className="mt-8 p-6 bg-white rounded-lg border border-border">
          <h2 className="text-2xl font-semibold text-secondary mb-4">
            Phase 1: Setup Complete ✅
          </h2>
          <p className="text-text/70">
            Monorepo structure is ready. Next: Authentication system.
          </p>
        </div>
      </div>
    </main>
  );
}