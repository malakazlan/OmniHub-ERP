param(
    [Parameter(Mandatory=$true)][string]$Name,
    [Parameter(Mandatory=$true)][string]$Email,
    [switch]$Global
)

if ($Global) {
    git config --global user.name "$Name"
    git config --global user.email "$Email"
    Write-Host "Updated global Git identity:" -ForegroundColor Green
} else {
    git config user.name "$Name"
    git config user.email "$Email"
    Write-Host "Updated repository Git identity in $(Get-Location):" -ForegroundColor Green
}

Write-Host "user.name  = $(git config user.name)"
Write-Host "user.email = $(git config user.email)"
