@echo off
cd /d "%~dp0"
if not exist node_modules (
    echo Installazione dipendenze...
    set NODE_OPTIONS=--use-system-ca
    call npm install --no-audit --no-fund
)
echo Admin Panel su http://localhost:3000  (chiudi questa finestra per fermarlo)
call npm run dev -- --open /clarity
pause
