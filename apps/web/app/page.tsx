// apps/web/app/page.tsx
import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-text mb-4">
          Welcome to KitchZero
        </h1>
        <p className="text-lg text-text/80 mb-8">
          Food waste reduction platform for restaurants
        </p>
        
        <div className="mb-8">
          <Link 
            href="/login"
            className="inline-flex items-center px-6 py-3 bg-primary text-white font-medium rounded-md hover:bg-primary/90 transition-colors"
          >
            Sign In to Continue
          </Link>
        </div>

        <div className="mt-8 p-6 bg-white rounded-lg border border-border">
          <h2 className="text-2xl font-semibold text-secondary mb-4">
            Phase 2: Authentication UI Complete ✅
          </h2>
          <p className="text-text/70">
            Modern, secure, and accessible login interface implemented with industry best practices.
          </p>
        </div>
      </div>
    </main>
  );
}