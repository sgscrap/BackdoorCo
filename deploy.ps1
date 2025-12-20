$message = Read-Host "Enter deployment message"
if ($message -eq "") {
    $message = "Update site content"
}

Write-Host "🚀 Preparing deployment..." -ForegroundColor Cyan

git add .
git commit -m "$message"
git push origin main

if ($?) {
    Write-Host "✅ Code pushed to GitHub! Netlify should deploy shortly." -ForegroundColor Green
} else {
    Write-Host "❌ Deployment failed. Please check your internet connection or git settings." -ForegroundColor Red
}
Pause
