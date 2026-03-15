import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Geramos um diretório com nome único para evitar bloqueios do Windows
const timestamp = Math.floor(Date.now() / 1000);
const releaseDir = `AI-Studio-Final-${timestamp}`;
const nodeModules = 'node_modules';

try {
    console.log(`--- [LOG] Gerando Versão de Produção (ID: ${timestamp}) ---`);

    // 1. Criar estrutura
    fs.mkdirSync(releaseDir);
    const apiNodeModules = path.join(releaseDir, 'node_modules');
    fs.mkdirSync(apiNodeModules);

    // 2. Build do site
    console.log('1/4: Compilando Frontend...');
    execSync('npm run build', { stdio: 'inherit' });

    // 3. Bundling do Servidor (FORÇANDO .CJS)
    console.log('2/4: Gerando bundle de compatibilidade (app.cjs)...');
    // Usamos --define para injetar a variável de ambiente diretamente no código
    // Usamos --format=cjs e o nome do arquivo .cjs para garantir que o Node v24 aceite
    execSync(`npx esbuild server.ts --bundle --platform=node --format=cjs --outfile=${path.join(releaseDir, 'app.cjs')} --define:process.env.NODE_ENV='"production"' --external:better-sqlite3 --external:node-pty --external:vite`, { stdio: 'inherit' });

    // 4. Preparar Motor e Bibliotecas
    console.log('3/4: Preparando motor de execução...');
    
    // Motor Node (engine.exe)
    fs.copyFileSync(process.execPath, path.join(releaseDir, 'engine.exe'));

    // Site (dist-client)
    fs.cpSync('dist-client', path.join(releaseDir, 'dist-client'), { recursive: true });

    // Copiar Módulos Nativos de forma limpa
    const modulesToCopy = ['better-sqlite3', 'node-pty'];
    modulesToCopy.forEach(mod => {
        const src = path.join(nodeModules, mod);
        const dest = path.join(apiNodeModules, mod);
        fs.cpSync(src, dest, { 
            recursive: true,
            filter: (src) => !src.includes('node_modules') 
        });
    });

    // 5. Script de Inicialização e package.json local
    console.log('4/4: Criando inicializadores de produção...');
    
    // Criamos um package.json local que FORÇA o modo CommonJS na pasta de entrega
    const localPkg = { name: "ai-studio-production", type: "commonjs" };
    fs.writeFileSync(path.join(releaseDir, 'package.json'), JSON.stringify(localPkg, null, 2));

    const batContent = `@echo off
title Local Multi-Agent Studio - Produção
echo ===========================================
echo    INICIANDO AMBIENTE DE PRODUÇÃO
echo ===========================================
set NODE_ENV=production
"engine.exe" "app.cjs"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERRO FATAL] O servidor parou.
    pause
)
`;
    fs.writeFileSync(path.join(releaseDir, 'INICIAR.bat'), batContent);

    // Recursos Finais
    if (fs.existsSync('studio.db')) fs.copyFileSync('studio.db', path.join(releaseDir, 'studio.db'));
    if (fs.existsSync('.env')) fs.copyFileSync('.env', path.join(releaseDir, '.env'));

    console.log('\n✅ BUILD DE PRODUÇÃO FINALIZADO!');
    console.log(`\nLocal da pasta: ${path.resolve(releaseDir)}`);
    console.log('\nEste pacote é AUTO-SUFICIENTE. Pode mover para qualquer lugar.');

} catch (error) {
    console.error('\n❌ Falha:', error.message);
    process.exit(1);
}
