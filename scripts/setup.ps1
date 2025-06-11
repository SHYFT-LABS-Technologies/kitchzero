# KitchZero Windows Setup Script
Write-Host "🏗️ Setting up KitchZero on Windows..." -ForegroundColor Green

# Check if .env exists
if (-not (Test-Path ".env")) {
    Write-Host "📄 Copying .env.example to .env..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "⚠️ Please edit .env with your configuration" -ForegroundColor Yellow
}

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Green
pnpm install

# Check if Docker is running
try {
    $dockerInfo = docker info 2>$null
    if (-not $dockerInfo) {
        throw "Docker not running"
    }
} catch {
    Write-Host "❌ Docker is not running. Please start Docker Desktop and try again." -ForegroundColor Red
    exit 1
}

# Start database
Write-Host "🐘 Starting PostgreSQL..." -ForegroundColor Green
docker compose -f docker/docker-compose.dev.yml --env-file docker/.env.docker up -d

# Wait for database to be ready
Write-Host "⏳ Waiting for database to be ready..." -ForegroundColor Yellow
$timeout = 30
$elapsed = 0
do {
    Start-Sleep -Seconds 1
    $elapsed++
    try {
        $dbReady = docker compose -f docker/docker-compose.dev.yml exec postgres pg_isready -U kitchzero 2>$null
    } catch {
        $dbReady = $false
    }
} while (-not $dbReady -and $elapsed -lt $timeout)

if (-not $dbReady) {
    Write-Host "❌ Database failed to start within $timeout seconds" -ForegroundColor Red
    exit 1
}

# Setup database schema
Write-Host "🗃️ Setting up database schema..." -ForegroundColor Green
Set-Location "apps/api"
pnpm db:generate
pnpm db:push
Set-Location "../.."

Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Edit .env if needed" -ForegroundColor White
Write-Host "   2. Run 'pnpm dev' to start development" -ForegroundColor White
Write-Host "   3. Visit http://localhost:3000 (Web) and http://localhost:3001/health (API)" -ForegroundColor White