const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');
const path = require('path');

const isMac = process.platform === 'darwin';

module.exports = {
  packagerConfig: {
    name: 'PRODTEC Packinghouse',
    executableName: 'prodtec-packinghouse',
    icon: path.join(__dirname, 'assets', 'icon'),
    asar: {
      unpack: '**/node_modules/{sqlite3,@mapbox,napi-macros,node-addon-api,prebuild-install,node-abi}/**'
    },
    extraResource: [
      './cv_service.py'
    ],
    win32metadata: {
      CompanyName: 'MG Consultoria e Automação',
      FileDescription: 'PRODTEC Packinghouse - Sistema de Gestão',
      ProductName: 'PRODTEC Packinghouse',
    }
  },
  rebuildConfig: {},
  makers: [
    // ── Windows .zip (Universal - funciona compilando no Mac) ───────────
    {
      name: '@electron-forge/maker-zip',
      platforms: ['win32', 'darwin', 'linux'],
    },
    // ── Windows Squirrel (.exe) — desativado no Mac para evitar erro de Wine ──
    ...(!isMac ? [{
      name: '@electron-forge/maker-squirrel',
      platforms: ['win32'],
      config: {
        name: 'prodtec_packinghouse',
        authors: 'MG Consultoria e Automação',
        description: 'Sistema de gestão de packinghouse — rastreabilidade, qualidade e estoque',
      },
    }] : []),
    // ── Linux .deb — desativado no Mac para evitar erro de dpkg/fakeroot ──────
    ...(!isMac ? [{
      name: '@electron-forge/maker-deb',
      platforms: ['linux'],
      config: {
        options: {
          name: 'prodtec-packinghouse',
          productName: 'PRODTEC Packinghouse',
          genericName: 'Packinghouse Manager',
          description: 'Sistema de gestão de packinghouse — rastreabilidade, qualidade e estoque',
          maintainer: 'MG Consultoria e Automação <mgconsultoriaautomacao@gmail.com>',
          homepage: 'https://github.com/mgconsultoriaautomacao-cmd/PRODTECHLOCAL',
          icon: path.join(__dirname, 'assets', 'icon.png'),
          categories: ['Office', 'Utility'],
          depends: ['libnotify4', 'libxtst6', 'libnss3', 'libxss1', 'libasound2', 'sqlite3', 'python3']
        },
      },
    }] : [])
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: true,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: false,
      [FuseV1Options.OnlyLoadAppFromAsar]: false,
    }),
  ],
};
