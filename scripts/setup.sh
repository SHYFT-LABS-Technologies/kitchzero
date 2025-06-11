#!/bin/bash
echo "🏗️  Setting up KitchZero development environment..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "📄 Copying .env.example to .env..."
    cp .env.example .env
    echo "⚠️  Please edit .env with your configuration"
fi

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Start database with environment variables
echo "🐘 Starting PostgreSQL..."
docker compose -f docker/docker-compose.dev.yml --env-file docker/.env.docker up -d

# Wait for DB to be ready with health check
echo "⏳ Waiting for database to be ready..."
timeout 30s bash -c 'until docker compose -f docker/docker-compose.dev.yml exec postgres pg_isready -U kitchzero; do sleep 1; done'

# Generate Prisma client and push schema
echo "🗃️  Setting up database schema..."
cd apps/api
pnpm db:generate
pnpm db:push
cd ../..

echo "✅ Setup complete!"
echo ""
echo "🚀 Next steps:"
echo "   1. Edit .env if needed"
echo "   2. Run 'pnpm dev' to start development"
echo "   3. Visit http://localhost:3000 (Web) and http://localhost:3001/health (API)"