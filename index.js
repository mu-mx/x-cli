#!/usr/bin/env node

// https://github.com/mu-mx/qs-template/tree/main/out-vanilla

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import spawn from 'cross-spawn';
import minimist from 'minimist';
import prompts from 'prompts';
import {
  blue,
  cyan,
  green,
  lightBlue,
  lightGreen,
  lightRed,
  magenta,
  red,
  reset,
  yellow,
} from 'kolorist';
import downloadGitRepo from 'git-down-repo';

const argv = minimist(process.argv.slice(2), {
  default: { help: false },
  alias: { h: 'help', t: 'template' },
  string: ['_'],
});
const cwd = process.cwd();

const helpMessage = `\
用法: x-create [选项]... [目录]

在JavaScript或TypeScript中创建新的Vite项目。
在没有参数的情况下，以交互模式启动CLI。

Options:
  -t, --template NAME        use a specific template

可用模板:
${yellow('vanilla-ts     vanilla')}
${green('vue-ts         vue')}
${cyan('react-ts       react')}
${cyan('react-swc-ts   react-swc')}
${magenta('preact-ts      preact')}
${lightRed('lit-ts         lit')}
${red('svelte-ts      svelte')}
${blue('solid-ts       solid')}
${lightBlue('qwik-ts        qwik')}`;

const FRAMEWORKS = [
  {
    name: '原生js',
    display: '原生js 自用',
    color: yellow,
    variants: [
      {
        name: 'out-vanilla',
        display: 'JavaScript',
        color: yellow,
      },
      {
        name: 'out-vanilla-ts',
        display: 'TypeScript',
        color: blue,
      },
    ],
  },
  {
    name: 'react',
    display: 'react 自用',
    color: yellow,
    variants: [
      {
        name: 'out-react',
        display: 'JavaScript',
        color: yellow,
      },
      {
        name: 'out-react-ts',
        display: 'TypeScript',
        color: blue,
      },
    ],
  },
  {
    name: 'vue',
    display: 'Vue 自用',
    color: green,
    variants: [
      {
        name: 'out-vue',
        display: 'JavaScript',
        color: yellow,
      },
      {
        name: 'out-vue-ts',
        display: 'TypeScript',
        color: blue,
      },
      {
        name: 'custom-create-vue',
        display: 'Customize with create-vue ↗',
        color: green,
        customCommand: 'npm create vue@latest TARGET_DIR',
      },
      {
        name: 'custom-nuxt',
        display: 'Nuxt ↗',
        color: lightGreen,
        customCommand: 'npm exec nuxi init TARGET_DIR',
      },
    ],
  },
  {
    name: 'react',
    display: 'React 公司',
    color: cyan,
    variants: [
      {
        name: 'work-react',
        display: 'JavaScript',
        color: yellow,
      },
      {
        name: 'work-react-ts',
        display: 'TypeScript',
        color: blue,
      },
    ],
  },
  {
    name: 'vue',
    display: 'Vue 公司',
    color: magenta,
    variants: [
      {
        name: 'work-vue',
        display: 'JavaScript',
        color: yellow,
      },
      {
        name: 'work-vue-ts',
        display: 'TypeScript',
        color: blue,
      },
    ],
  },
  {
    name: 'others',
    display: 'Others',
    color: reset,
    variants: [
      {
        name: 'create-vite-extra',
        display: 'create-vite-extra ↗',
        color: reset,
        customCommand: 'npm create vite-extra@latest TARGET_DIR',
      },
      {
        name: 'create-electron-vite',
        display: 'create-electron-vite ↗',
        color: reset,
        customCommand: 'npm create electron-vite@latest TARGET_DIR',
      },
    ],
  },
];

const defaultTargetDir = 'xc-project';

function formatTargetDir(targetDir) {
  return targetDir?.trim().replace(/\/+$/g, '');
}

function isValidPackageName(projectName) {
  return /^(?:@[a-z\d\-*~][a-z\d\-*._~]*\/)?[a-z\d\-~][a-z\d\-._~]*$/.test(
    projectName,
  );
}

function toValidPackageName(projectName) {
  return projectName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/^[._]/, '')
    .replace(/[^a-z\d\-~]+/g, '-');
}

function copyDir(srcDir, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  for (const file of fs.readdirSync(srcDir)) {
    const srcFile = path.resolve(srcDir, file);
    const destFile = path.resolve(destDir, file);
    copy(srcFile, destFile);
  }
}

function isEmpty(path) {
  const files = fs.readdirSync(path);
  return files.length === 0 || (files.length === 1 && files[0] === '.git');
}

function emptyDir(dir) {
  if (!fs.existsSync(dir)) {
    return;
  }
  for (const file of fs.readdirSync(dir)) {
    if (file === '.git') {
      continue;
    }
    fs.rmSync(path.resolve(dir, file), { recursive: true, force: true });
  }
}

function pkgFromUserAgent(userAgent) {
  if (!userAgent) return undefined;
  const pkgSpec = userAgent.split(' ')[0];
  const pkgSpecArr = pkgSpec.split('/');
  return {
    name: pkgSpecArr[0],
    version: pkgSpecArr[1],
  };
}

function setupReactSwc(root, isTs) {
  editFile(path.resolve(root, 'package.json'), (content) => {
    return content.replace(
      /"@vitejs\/plugin-react": ".+?"/,
      `"@vitejs/plugin-react-swc": "^3.5.0"`,
    );
  });
  editFile(
    path.resolve(root, `vite.config.${isTs ? 'ts' : 'js'}`),
    (content) => {
      return content.replace(
        '@vitejs/plugin-react',
        '@vitejs/plugin-react-swc',
      );
    },
  );
}

function editFile(file, callback) {
  const content = fs.readFileSync(file, 'utf-8');
  fs.writeFileSync(file, callback(content), 'utf-8');
}

async function download(tem, packageName) {
  console.log('packageName - >:', packageName);
  console.log('tem - >:', tem);
  // 拼接下载路径 这里放自己的模板仓库url
  const requestUrl = `mu-mx/qs-template/`;

  await downloadGitRepo(requestUrl + tem, packageName, function (err) {
    console.log(err ? 'Error' : 'Success')
  })
  console.log('模板准备完成!');
}

async function init() {
  const argTargetDir = formatTargetDir(argv._[0]);
  const argTemplate = argv.template || argv.t;

  const help = argv.help;
  if (help) {
    console.log(helpMessage);
    return;
  }

  let targetDir = argTargetDir || defaultTargetDir;
  const getProjectName = () =>
    targetDir === '.' ? path.basename(path.resolve()) : targetDir;

  let result;

  prompts.override({
    overwrite: argv.overwrite,
  });

  try {
    result = await prompts(
      [
        {
          type: argTargetDir ? null : 'text',
          name: 'projectName',
          message: reset('Project name:'),
          initial: defaultTargetDir,
          onState: (state) => {
            targetDir = formatTargetDir(state.value) || defaultTargetDir;
          },
        },
        {
          type: () =>
            !fs.existsSync(targetDir) || isEmpty(targetDir) ? null : 'select',
          name: 'overwrite',
          message: () =>
            (targetDir === '.'
              ? 'Current directory'
              : `Target directory "${targetDir}"`) +
            ` is not empty. Please choose how to proceed:`,
          initial: 0,
          choices: [
            {
              title: 'Remove existing files and continue',
              value: 'yes',
            },
            {
              title: 'Cancel operation',
              value: 'no',
            },
            {
              title: 'Ignore files and continue',
              value: 'ignore',
            },
          ],
        },
        {
          type: (_, { overwrite }) => {
            if (overwrite === 'no') {
              throw new Error(red('✖') + ' Operation cancelled');
            }
            return null;
          },
          name: 'overwriteChecker',
        },
        {
          type: () => (isValidPackageName(getProjectName()) ? null : 'text'),
          name: 'packageName',
          message: reset('Package name:'),
          initial: () => toValidPackageName(getProjectName()),
          validate: (dir) =>
            isValidPackageName(dir) || 'Invalid package.json name',
        },
        {
          type:
            argTemplate && TEMPLATES.includes(argTemplate) ? null : 'select',
          name: 'framework',
          message:
            typeof argTemplate === 'string' && !TEMPLATES.includes(argTemplate)
              ? reset(
                  `"${argTemplate}" isn't a valid template. Please choose from below: `,
                )
              : reset('Select a framework:'),
          initial: 0,
          choices: FRAMEWORKS.map((framework) => {
            const frameworkColor = framework.color;
            return {
              title: frameworkColor(framework.display || framework.name),
              value: framework,
            };
          }),
        },
        {
          type: (framework) =>
            framework && framework.variants ? 'select' : null,
          name: 'variant',
          message: reset('Select a variant:'),
          choices: (framework) =>
            framework.variants.map((variant) => {
              const variantColor = variant.color;
              return {
                title: variantColor(variant.display || variant.name),
                value: variant.name,
              };
            }),
        },
      ],
      {
        onCancel: () => {
          throw new Error(red('✖') + ' Operation cancelled');
        },
      },
    );
  } catch (cancelled) {
    console.log(cancelled.message);
    return;
  }

  // user choice associated with prompts
  const { framework, overwrite, packageName, variant } = result;

  const root = path.join(cwd, targetDir);
  console.log('targetDir - >:', targetDir);

  if (overwrite === 'yes') {
    emptyDir(root);
  } else if (!fs.existsSync(root)) {
    fs.mkdirSync(root, { recursive: true });
  }

  // determine template
  let template = variant || framework?.name || argTemplate;
  let isReactSwc = false;
  if (template.includes('-swc')) {
    isReactSwc = true;
    template = template.replace('-swc', '');
  }

  const pkgInfo = pkgFromUserAgent(process.env.npm_config_user_agent);
  const pkgManager = pkgInfo ? pkgInfo.name : 'npm';
  const isYarn1 = pkgManager === 'yarn' && pkgInfo?.version.startsWith('1.');

  const { customCommand } =
    FRAMEWORKS.flatMap((f) => f.variants).find((v) => v.name === template) ??
    {};

  if (customCommand) {
    const fullCustomCommand = customCommand
      .replace(/^npm create /, () => {
        // `bun create` uses it's own set of templates,
        // the closest alternative is using `bun x` directly on the package
        if (pkgManager === 'bun') {
          return 'bun x create-';
        }
        return `${pkgManager} create `;
      })
      // Only Yarn 1.x doesn't support `@version` in the `create` command
      .replace('@latest', () => (isYarn1 ? '' : '@latest'))
      .replace(/^npm exec/, () => {
        // Prefer `pnpm dlx`, `yarn dlx`, or `bun x`
        if (pkgManager === 'pnpm') {
          return 'pnpm dlx';
        }
        if (pkgManager === 'yarn' && !isYarn1) {
          return 'yarn dlx';
        }
        if (pkgManager === 'bun') {
          return 'bun x';
        }
        // Use `npm exec` in all other cases,
        // including Yarn 1.x and other custom npm clients.
        return 'npm exec';
      });

    const [command, ...args] = fullCustomCommand.split(' ');
    // we replace TARGET_DIR here because targetDir may include a space
    const replacedArgs = args.map((arg) =>
      arg.replace('TARGET_DIR', targetDir),
    );
    const { status } = spawn.sync(command, replacedArgs, {
      stdio: 'inherit',
    });
    process.exit(status ?? 0);
  }

  console.log(`\nScaffolding project in ${root}...`);

  await download(template, root);

  // const templateDir = path.resolve(
  //   fileURLToPath(import.meta.url),
  //   '../..',
  //   `template-${template}`,
  // );

  // const write = (file, content) => {
  //   const targetPath = path.join(root, renameFiles[file] ?? file);
  //   if (content) {
  //     fs.writeFileSync(targetPath, content);
  //   } else {
  //     copy(path.join(templateDir, file), targetPath);
  //   }
  // };

  // const files = fs.readdirSync(templateDir);
  // for (const file of files.filter((f) => f !== 'package.json')) {
  //   write(file);
  // }

  const pkg = JSON.parse(
    fs.readFileSync(path.join(root, `package.json`), 'utf-8'),
  );

  pkg.name = packageName || getProjectName();

  write('package.json', JSON.stringify(pkg, null, 2) + '\n');

  // if (isReactSwc) {
  //   setupReactSwc(root, template.endsWith('-ts'));
  // }

  const cdProjectName = path.relative(cwd, root);
  console.log(`\nDone. Now run:\n`);
  if (root !== cwd) {
    console.log(
      `  cd ${
        cdProjectName.includes(' ') ? `"${cdProjectName}"` : cdProjectName
      }`,
    );
  }

  switch (pkgManager) {
    case 'yarn':
      console.log('  yarn');
      console.log('  yarn dev');
      break;
    default:
      console.log(`  ${pkgManager} install`);
      console.log(`  ${pkgManager} run dev`);
      break;
  }
  console.log();
}

init().catch((e) => {
  console.error(e);
});
