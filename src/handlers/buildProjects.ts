import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const execAsync = promisify(exec);

interface BuildProjectsRequest {
  useConfig?: boolean;
  configName?: string;
  versionControlPaths?: {
    path: string;
    type: 'git' | 'tfs';
  }[];
  projects?: {
    path: string;
    name: string;
    dependencies?: string[];
  }[];
  msbuildPath?: string;
  maxRetries?: number;
}

interface BuildResult {
  project: string;
  success: boolean;
  error?: string;
  warnings?: string[];
}

export async function buildProjectsHandler(args: unknown) {
  const inputRequest = args as BuildProjectsRequest;
  
  let request: BuildProjectsRequest = inputRequest;
  
  // Config dosyasından yükle (varsayılan olarak her zaman yükle)
  if (inputRequest.useConfig !== false) {
    const configData = await loadConfigFile(inputRequest.configName);
    
    // Config verilerini request ile birleştir (request parametreleri öncelikli)
    request = {
      ...configData,
      ...inputRequest,
      // Array'ler için özel birleştirme
      versionControlPaths: inputRequest.versionControlPaths || configData.versionControlPaths,
      projects: inputRequest.projects || configData.projects
    };
  }
  
  // Eğer hala temel veriler yoksa hata döndür
  if (!request.projects || request.projects.length === 0) {
    return {
      content: [
        {
          type: 'text',
          text: `❌ **Konfigürasyon Hatası**

Proje listesi bulunamadı. Aşağıdaki konumlardan birinde config dosyası oluşturun:

📁 **Olası config konumları:**
- \`config/build-config.json\` (varsayılan)
- \`config/build-config-${inputRequest.configName || 'custom'}.json\` (özel)

📝 **Örnek config dosyası:**
\`\`\`json
{
  "versionControlPaths": [
    {
      "path": "D:/OSYSTFS/OSYS",
      "type": "git"
    }
  ],
  "projects": [
    {
      "path": "D:/Projects/MyApp/MyApp.csproj",
      "name": "MyApp"
    }
  ],
  "msbuildPath": "C:/Program Files/Microsoft Visual Studio/2022/Professional/MSBuild/Current/Bin/MSBuild.exe",
  "maxRetries": 3
}
\`\`\`

**Kullanım:**
- \`"Tüm projeleri derle"\` → build-config.json kullanır
- \`"Production projelerini derle"\` → build-config-production.json kullanır`,
        },
      ],
    };
  }
  
  const msbuildPath = request.msbuildPath || 'C:\\Program Files\\Microsoft Visual Studio\\2022\\Professional\\MSBuild\\Current\\Bin\\MSBuild.exe';
  const maxRetries = request.maxRetries || 3;
  
  let result = '# 🔨 Toplu Derleme İşlemi Başlatıldı\n\n';
  
  // Config bilgisini göster
  if (request.configName || inputRequest.configName) {
    result += `📋 **Konfigürasyon:** ${request.configName || inputRequest.configName}\n\n`;
  } else {
    result += `📋 **Konfigürasyon:** build-config.json (varsayılan)\n\n`;
  }
  
  result += `📊 **Proje Sayısı:** ${request.projects.length}\n`;
  result += `🔧 **MSBuild:** ${path.basename(msbuildPath)}\n\n`;
  
  try {
    // 1. Version Control İşlemleri (isteğe bağlı)
    if (request.versionControlPaths && request.versionControlPaths.length > 0) {
      result += '## 📥 Version Control Güncellemeleri\n\n';
      const vcResults = await updateVersionControl(request.versionControlPaths);
      
      if (vcResults.hasConflict) {
        result += '❌ **KONFLİKT TESPİT EDİLDİ!**\n\n';
        result += '### Konflikt Detayları:\n';
        for (const conflict of vcResults.conflicts) {
          result += `- **${conflict.path}** (${conflict.type})\n`;
          result += `  ${conflict.message}\n\n`;
        }
        result += '**İşlem iptal edildi.** Lütfen konfliktleri manuel olarak çözün.\n';
        
        return {
          content: [
            {
              type: 'text',
              text: result,
            },
          ],
        };
      }
      
      result += '✅ Tüm repository\'ler başarıyla güncellendi.\n\n';
      for (const update of vcResults.updates) {
        result += `- **${update.path}** (${update.type}): ${update.status}\n`;
      }
      result += '\n';
    } else {
      result += '⏭️ Version control güncellemesi atlandı.\n\n';
    }
    
    // 2. Projeler Derleniyor
    result += '## 🗂️ Projeler Derleniyor\n\n';
    const buildResults = await smartBuildSystem(request.projects, msbuildPath, maxRetries);
    
    // 3. Sonuç Raporu
    result += '## 📊 Derleme Raporu\n\n';
    
    const successfulBuilds = buildResults.filter(r => r.success);
    const failedBuilds = buildResults.filter(r => !r.success);
    
    result += `- **Başarılı:** ${successfulBuilds.length} proje\n`;
    result += `- **Başarısız:** ${failedBuilds.length} proje\n`;
    result += `- **Toplam:** ${buildResults.length} proje\n\n`;
    
    if (successfulBuilds.length > 0) {
      result += '### ✅ Başarılı Projeler:\n';
      for (const build of successfulBuilds) {
        result += `- **${build.project}**\n`;
        if (build.warnings && build.warnings.length > 0) {
          result += `  ⚠️ ${build.warnings[0]}\n`;
        }
      }
      result += '\n';
    }
    
    if (failedBuilds.length > 0) {
      result += '### ❌ Başarısız Projeler:\n';
      for (const build of failedBuilds) {
        result += `- **${build.project}**\n`;
        if (build.error) {
          // Sadece önemli hata mesajını göster
          const errorLines = build.error.split('\n')
            .filter(line => line.includes('error') || line.includes('Error'))
            .slice(0, 2);
          
          if (errorLines.length > 0) {
            result += `  \`\`\`\n${errorLines.join('\n')}\n  \`\`\`\n`;
          }
        }
      }
      result += '\n';
    }
    
    // 4. Özet ve Öneriler
    if (failedBuilds.length > 0) {
      result += '## 💡 Öneriler:\n\n';
      result += '1. Başarısız projelerin bağımlılıklarını kontrol edin\n';
      result += '2. Visual Studio\'da Clean Solution yapıp tekrar deneyin\n';
      result += '3. NuGet paket referanslarını kontrol edin\n';
      result += '4. .NET Framework/Core versiyonlarını kontrol edin\n\n';
    }
    
    // Genel başarı durumu
    const successRate = Math.round((successfulBuilds.length / buildResults.length) * 100);
    if (successRate === 100) {
      result += '🎉 **Tüm projeler başarıyla derlendi!**\n';
    } else if (successRate >= 80) {
      result += `⚠️ **Derleme %${successRate} başarılı** - Bazı projeler başarısız oldu.\n`;
    } else {
      result += `❌ **Derleme %${successRate} başarılı** - Çok sayıda proje başarısız oldu.\n`;
    }
    
    result += `\n⏱️ **İşlem Tamamlandı:** ${new Date().toLocaleTimeString('tr-TR')}\n`;
    
  } catch (error) {
    result += `\n\n❌ **Kritik Hata:** ${error instanceof Error ? error.message : 'Bilinmeyen hata'}\n`;
  }
  
  return {
    content: [
      {
        type: 'text',
        text: result,
      },
    ],
  };
}

// Config dosyasını yükle - Production için optimize edilmiş
async function loadConfigFile(configName?: string): Promise<BuildProjectsRequest> {
  try {
    const configFileName = configName ? `build-config-${configName}.json` : 'build-config.json';
    
    // MCP Server çalıştığında working directory Claude'un çalıştırdığı yerdir
    // Bu yüzden __dirname kullanarak compiled dosya konumundan relative gideriz
    const configPaths = [
      // dist/config/build-config.json (npm run build ile kopyalanan)
      path.join(__dirname, '..', 'config', configFileName),
      // config/build-config.json (development durumunda)  
      path.join(__dirname, '..', '..', 'config', configFileName),
      // Absolute current working directory
      path.join(process.cwd(), 'dist', 'config', configFileName),
      path.join(process.cwd(), 'config', configFileName),
    ];
    
    console.error(`🔍 Config aranıyor: ${configFileName}`);
    console.error(`📁 __dirname: ${__dirname}`);
    console.error(`📁 process.cwd(): ${process.cwd()}`);
    
    for (const configPath of configPaths) {
      try {
        console.error(`🔎 Deneniyor: ${configPath}`);
        await fs.access(configPath);
        const configContent = await fs.readFile(configPath, 'utf8');
        const config = JSON.parse(configContent);
        
        console.error(`✅ Config bulundu ve yüklendi: ${configPath}`);
        console.error(`📊 Proje sayısı: ${config.projects?.length || 0}`);
        console.error(`🔧 Version control: ${config.versionControlPaths?.length || 0} path`);
        
        return config;
      } catch (err) {
        console.error(`❌ Bulunamadı: ${configPath}`);
        continue;
      }
    }
    
    // Hiç config bulunamadı - detaylı hata
    console.error(`❌ Config dosyası bulunamadı: ${configFileName}`);
    console.error(`🔍 Aranan konumlar:`);
    configPaths.forEach((p, i) => console.error(`  ${i + 1}. ${p}`));
    
    // Working directory'deki dosyaları listele
    try {
      const cwdFiles = await fs.readdir(process.cwd());
      console.error(`📁 Working directory içeriği: ${cwdFiles.join(', ')}`);
      
      if (cwdFiles.includes('config')) {
        const configFiles = await fs.readdir(path.join(process.cwd(), 'config'));
        console.error(`📁 Config klasörü içeriği: ${configFiles.join(', ')}`);
      }
    } catch (err) {
      console.error(`⚠️ Directory listelenemedi`);
    }
    
    return {} as BuildProjectsRequest;
    
  } catch (error) {
    console.error('💥 Config yükleme hatası:', error);
    return {} as BuildProjectsRequest;
  }
}

// Version Control güncelleme
async function updateVersionControl(paths: any[]) {
  const results = {
    hasConflict: false,
    conflicts: [] as any[],
    updates: [] as any[]
  };
  
  for (const vcPath of paths) {
    try {
      if (vcPath.type === 'git') {
        // Git pull
        const { stdout, stderr } = await execAsync(`git pull`, { cwd: vcPath.path });
        
        if (stderr && (stderr.toLowerCase().includes('conflict') || stderr.toLowerCase().includes('merge'))) {
          results.hasConflict = true;
          results.conflicts.push({
            path: vcPath.path,
            type: 'git',
            message: stderr
          });
        } else {
          results.updates.push({
            path: vcPath.path,
            type: 'git',
            status: stdout.includes('Already up to date') || stdout.includes('Already up-to-date') 
              ? 'Zaten güncel' : 'Güncellendi'
          });
        }
      } else if (vcPath.type === 'tfs') {
        // TFS get latest
        const { stdout, stderr } = await execAsync(`tf get /recursive`, { cwd: vcPath.path });
        
        if (stderr && stderr.toLowerCase().includes('conflict')) {
          results.hasConflict = true;
          results.conflicts.push({
            path: vcPath.path,
            type: 'tfs',
            message: stderr
          });
        } else {
          results.updates.push({
            path: vcPath.path,
            type: 'tfs',
            status: 'Güncellendi'
          });
        }
      }
    } catch (error) {
      // Version control hatası - kritik olmayan hata
      results.updates.push({
        path: vcPath.path,
        type: vcPath.type,
        status: `Hata: ${error}`
      });
    }
  }
  
  return results;
}

// Akıllı derleme sistemi
async function smartBuildSystem(projects: any[], msbuildPath: string, maxRetries: number): Promise<BuildResult[]> {
  let results: BuildResult[] = [];
  let remainingProjects = [...projects];
  let retryCount = 0;
  let previousFailCount = projects.length + 1;
  
  while (remainingProjects.length > 0 && retryCount < maxRetries) {
    console.error(`Derleme turı ${retryCount + 1}/${maxRetries}: ${remainingProjects.length} proje`);
    
    const currentResults: BuildResult[] = [];
    const failedProjects: any[] = [];
    
    for (const project of remainingProjects) {
      console.error(`Derleniyor: ${project.name}`);
      const buildResult = await buildProject(project, msbuildPath);
      currentResults.push(buildResult);
      
      if (!buildResult.success) {
        failedProjects.push(project);
      }
    }
    
    results = currentResults;
    
    // Eğer başarısız proje sayısı azalıyorsa devam et
    if (failedProjects.length < previousFailCount && failedProjects.length > 0) {
      previousFailCount = failedProjects.length;
      remainingProjects = failedProjects;
      retryCount++;
      
      // Kısa bir bekleme süresi
      console.error(`${failedProjects.length} proje başarısız, yeniden denenecek...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    } else {
      break;
    }
  }
  
  return results;
}

// Tek bir projeyi derle
async function buildProject(project: any, msbuildPath: string): Promise<BuildResult> {
  const result: BuildResult = {
    project: project.name,
    success: false
  };
  
  try {
    // MSBuild komutu
    const command = `"${msbuildPath}" "${project.path}" /t:Build /p:Configuration=Debug /p:Platform=AnyCPU /m /v:m /nologo`;
    
    const { stdout, stderr } = await execAsync(command, {
      cwd: path.dirname(project.path),
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      timeout: 300000 // 5 dakika timeout
    });
    
    // Build başarılı mı kontrol et
    const output = stdout + stderr;
    
    if (output.includes('Build succeeded') || output.includes('0 Error(s)')) {
      result.success = true;
      
      // Warning'leri topla
      const warningMatch = output.match(/(\d+) Warning\(s\)/);
      if (warningMatch && parseInt(warningMatch[1]) > 0) {
        result.warnings = [`${warningMatch[1]} warning bulundu`];
      }
    } else {
      result.success = false;
      result.error = output;
    }
  } catch (error: any) {
    result.success = false;
    if (error.code === 'ETIMEDOUT') {
      result.error = 'Derleme timeout süresi aşıldı (5 dakika)';
    } else {
      result.error = error.message || 'Derleme hatası';
    }
  }
  
  return result;
}