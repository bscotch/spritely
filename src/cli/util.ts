import { oneline } from '@bscotch/utility';
import commander from 'commander';
import { Spritely } from '../lib/Spritely';
import path from 'path';
import { fsRetry as fs } from '../lib/utility';
import { assert, ErrorCodes, SpritelyError } from '../lib/errors';
import chokidar from 'chokidar';
import { debug, error, info, warning } from '../lib/log';

function crash(err?: SpritelyError | Error) {
  // If in debug mode, log the whole-assed error. Otherwise just the message.
  error('Crashed due to uncaught error');
  console.log(process.env.DEBUG == 'true' ? err : err?.message || err);
  process.exit(1);
}

process.on('uncaughtException', crash);
process.on('unhandledRejection', crash);

export interface SpritelyCliGeneralOptions {
  folder: string;
  recursive?: boolean;
  allowSubimageSizeMismatch?: boolean;
  move?: string;
  rootImagesAreSprites?: boolean;
  purgeTopLevelFolders?: boolean;
  ifMatch?: string;
  deleteSource?: boolean;
  gradientMapsFile?: string;
  watch?: boolean;
  debug?: boolean;
}

export const cliOptions = {
  folder: [
    '-f --folder <path>',
    oneline`
      Path to folder of subimages. Only
      immediate PNG children of each folder are treated as subimages.
      Defaults to the current working directory.`,
    process.cwd(),
  ],
  recursive: [
    '-r --recursive',
    oneline`
      Treat --folder, and all folders inside --folder (recursively), as sprites.
      USE WITH CAUTION!
      Each folder with immediate PNG children is treated as a sprite,
      with those children as its subimages.`,
  ],
  watch: [
    '-w --watch',
    oneline`
      Watch the source path for the the appearance of, or changes to,
      PNG files. When those events occur, re-run the fixers.
    `,
  ],
  mismatch: [
    '-a --allow-subimage-size-mismatch',
    oneline`
      By default it is required that all subimages of a sprite are
      supposed to have identical dimensions. You can optionally bypass
      this requirement.`,
  ],
  move: [
    '-m --move <path>',
    oneline`
      Move images to a different folder after modification.
      Useful for pipelines that use presence/absence
      of images as signals. Maintains relative paths.
      Deletes any existing subimages before copying the new
      ones over.`,
  ],
  purge: [
    '--purge-top-level-folders',
    oneline`
      Delete top-level folders (immediate children of --folder)
      prior to moving changed images.`,
  ],
  /** Specify root images are sprites */
  rootImages: [
    '-s --root-images-are-sprites',
    oneline`
      Prior to correction, move any immediate PNG children of
      --folder into folders with the same name as those images.
      This allows root-level images to be treated as individual
      sprites.`,
  ],
  match: [
    '-p --if-match <pattern>',
    oneline`
      Only perform the tasks on sprites whose top-level folder
      (relative to --folder) matches this pattern. Case-sensitive,
      converted to a regex pattern using JavaScript's 'new RegExp()'.`,
  ],
  debug: ['--debug', `Show verbose logging and error output.`],
} as const;

export function addGeneralOptions(cli: typeof commander) {
  cli
    .option(...cliOptions.folder)
    .option(...cliOptions.recursive)
    .option(...cliOptions.watch)
    .option(...cliOptions.mismatch)
    .option(...cliOptions.move)
    .option(...cliOptions.purge)
    .option(...cliOptions.rootImages)
    .option(...cliOptions.match)
    .option(...cliOptions.debug);
  return cli;
}

async function getSpriteDirs(folder: string, recursive?: boolean) {
  const folders = recursive
    ? [folder, ...(await fs.listFolders(folder, recursive))]
    : [folder];
  folders.reverse();
  return folders;
}

const methodOverrideTagNames = {
  c: 'crop',
  crop: 'crop',
  b: 'bleed',
  bleed: 'bleed',
} as const;

type SpritelyMethodOverrideTag = keyof typeof methodOverrideTagNames;
type SpritelyMethodOverrideName =
  typeof methodOverrideTagNames[SpritelyMethodOverrideTag];

/**
 * The sprite name may include suffixes to indicate overrides
 * for any CLI-applied adjustments. These can force application
 * of methods as well as prevent them. Suffixes being with `--`
 * and are chained together without separators. Valid suffices:
 * + `--c` or `--crop`: force cropping
 * + `--nc` or `--no-crop`: block cropping
 * + `--b` or `--bleed`: force bleeding
 * + `--nb` or `--no-bleed`: block bleeding
 */
function getMethodOverridesFromName(name: string) {
  // Pull off all the method suffixes
  const overrides = {
    name,
    add: [] as SpritelyMethodOverrideName[],
    remove: [] as SpritelyMethodOverrideName[],
  };
  let bareName = name; // suffixes removed
  const suffixRegex = /^(.*)(--(n?[cb]|(no-)?(crop|bleed)))$/;
  while (bareName.match(suffixRegex)) {
    const parts = bareName.match(suffixRegex);
    if (!parts) {
      break;
    }
    bareName = parts[1];
    const overrideType = parts[2].match(/^--n/) ? 'remove' : 'add';
    const methodNickname = parts[2].replace(
      /--(no-|n)?/,
      '',
    ) as SpritelyMethodOverrideTag;
    const method = methodOverrideTagNames[methodNickname];
    assert(method, `${methodNickname} is not a valid method suffix.`);
    debug(`Method override ${method} found for ${name}`);
    overrides[overrideType].push(method);
  }
  overrides.name = bareName;
  return overrides;
}

type SpritelyFixMethod = 'crop' | 'bleed' | 'applyGradientMaps';

async function fixSpriteDir(
  method: SpritelyFixMethod | SpritelyFixMethod[],
  spriteDir: string,
  options: SpritelyCliGeneralOptions,
) {
  try {
    const spriteOptions = {
      spriteDirectory: spriteDir,
      allowSubimageSizeMismatch: options.allowSubimageSizeMismatch,
      gradientMapsFile: options.gradientMapsFile,
    };
    // Reduce logger clutter by *not* logging "fixes" that result in no changes.
    let sprite = new Spritely(spriteOptions);
    const methodOverrides = getMethodOverridesFromName(sprite.name);
    // Combine methods provided by the CLI and by the name suffixes,
    // and then filter out those blocked by name suffixes.
    const methods = [
      ...new Set(
        (typeof method == 'string' ? [method] : method)
          .concat(methodOverrides.add)
          .filter(
            (method) =>
              !methodOverrides.remove.includes(
                method as SpritelyMethodOverrideName,
              ),
          ),
      ),
    ];
    // Sort so that cropping happens before bleeding, making bleeding less costly.
    methods.sort().reverse();
    debug(`Will apply ${methods} to ${sprite.name}`);

    // If the sprite uses suffixes, should nuke that folder and replace
    // it with one that doesn't have the suffixes.
    if (sprite.name != methodOverrides.name) {
      const spriteParent = path.dirname(sprite.path);
      const newSpritePath = path.join(spriteParent, methodOverrides.name);
      await fs.remove(newSpritePath); // make sure the dest gets clobbered
      await sprite.copy(spriteParent, { name: methodOverrides.name });
      await fs.remove(sprite.path);
      spriteDir = newSpritePath;
      debug(`Computed real name ${methodOverrides.name} from ${sprite.name}`);
      sprite = new Spritely({ ...spriteOptions, spriteDirectory: spriteDir });
    }

    let originalSubimageChecksums = await sprite.checksums;

    for (const spriteMethod of methods) {
      if (spriteMethod == 'applyGradientMaps') {
        await sprite.applyGradientMaps(options.deleteSource);
      } else if (spriteMethod == 'bleed') {
        await sprite.bleed();
      } else if (spriteMethod == 'crop') {
        await sprite.crop(methods.includes('bleed') ? 1 : 0);
      } else {
        throw new SpritelyError(`Invalid correction method ${spriteMethod}`);
      }
    }

    const fixedSubimageChecksums = await sprite.checksums;

    if (options.move) {
      debug('Moving modified sprite', sprite.name, 'to', options.folder);
      originalSubimageChecksums = [];
      const movedSpritePath = path.join(
        options.move,
        path.relative(options.folder, spriteDir),
      );
      if (await fs.pathExists(movedSpritePath)) {
        // Clear any excess files!
        const newNames = sprite.paths.map((p) => path.parse(p).base);
        const existingSubimages = await fs.listFilesByExtension(
          movedSpritePath,
          'png',
        );
        originalSubimageChecksums = await Promise.all(
          existingSubimages.map((i) => Spritely.pixelsChecksum(i)),
        );
        const waits = existingSubimages.map((existingSubimage) => {
          // Remove IF this subimage is extraneous to the
          // newer source.
          const existingName = path.parse(existingSubimage).base;
          if (!newNames.includes(existingName)) {
            debug('Removing excess subimage in move target', existingSubimage);
            return fs.remove(existingSubimage);
          }
          return Promise.resolve();
        });
        (await Promise.allSettled(waits)).forEach((wait, i) => {
          if (wait.status == 'rejected') {
            debug(`Remove attempt rejected`, existingSubimages[i]);
          }
        });
      }
      await sprite.move(path.dirname(movedSpritePath));
    }
    // If the resulting images are contained within the originals,
    // log via debug instead of info to reduce clutter.
    const nothingChanged = fixedSubimageChecksums.every((fixedChecksum) =>
      originalSubimageChecksums.includes(fixedChecksum),
    );
    (nothingChanged ? debug : info)(
      `Fixed ${sprite.name}:`,
      sprite.path.includes(' ') ? `"${sprite.path}"` : sprite.path,
      nothingChanged ? '(no changes)' : '',
    );
  } catch (err) {
    if (
      SpritelyError.matches(err, [
        ErrorCodes.noImagesFound,
        ErrorCodes.sizeMismatch,
      ])
    ) {
      warning(`Skipped sprite "${spriteDir}": ${err.message}`);
    } else {
      error(`Sprite clean failed for "${spriteDir}".`, err?.message);
      throw err;
    }
  }
}

async function fixSpriteDirs(
  method: SpritelyFixMethod | SpritelyFixMethod[],
  spriteDirs: string[],
  options: SpritelyCliGeneralOptions,
) {
  for (const spriteDir of spriteDirs) {
    await fixSpriteDir(method, spriteDir, options);
  }
}

function rootDir(fullpath: string, relativeTo = '.') {
  return path.relative(relativeTo, fullpath).split(/[\\/]/g)[0];
}

async function fixSprites(
  method: SpritelyFixMethod | SpritelyFixMethod[],
  options: SpritelyCliGeneralOptions,
) {
  if (options.rootImagesAreSprites) {
    // Find any root-level PNGs and move them into a folder by the same name
    const rootImages = await fs.listFilesByExtension(
      options.folder,
      'png',
      false,
    );
    for (const rootImage of rootImages) {
      const name = path.parse(rootImage).name;
      const newFolder = path.join(options.folder, name);
      const newPath = path.join(newFolder, `${name}.png`);
      await fs.ensureDir(newFolder);
      await fs.move(rootImage, newPath);
    }
  }
  const ifMatch = options.ifMatch ? new RegExp(options.ifMatch) : null;
  const spriteDirs = (
    await getSpriteDirs(options.folder, options.recursive)
  ).filter((spriteDir) => {
    if (options.purgeTopLevelFolders || options.ifMatch) {
      // Then make sure everything *has* a top-level folder
      const topLevelDir = rootDir(spriteDir, options.folder);
      if (!topLevelDir) {
        return false;
      }
      if (!ifMatch) {
        return true;
      }
      return topLevelDir.match(ifMatch);
    }
    return true;
  });
  if (options.purgeTopLevelFolders && options.move) {
    const topLevelDirs = [
      ...new Set(
        spriteDirs.map((spriteDir) => rootDir(spriteDir, options.folder)),
      ),
    ].filter((x) => x);
    for (const topLevelDir of topLevelDirs) {
      const moveDir = path.join(options.move, topLevelDir);
      const exists = await fs.pathExists(moveDir);
      if (!exists) {
        continue;
      }
      const childrenAreImagesOrFoldersChecks = (
        await fs.listPaths(moveDir, true)
      ).map(
        async (child) =>
          child.endsWith('.png') || (await fs.stat(child)).isDirectory(),
      );
      const childrenAreImagesOrFolders = (
        await Promise.all(childrenAreImagesOrFoldersChecks)
      ).every((yep) => yep);
      if (!childrenAreImagesOrFolders) {
        debug(
          'Cannot empty top-level dir',
          topLevelDir,
          'because some contents are neither images nor folders.',
        );
        continue;
      }
      debug('Emptying top-level dir', moveDir);
      await fs.emptyDir(moveDir);
      await fs.rmdir(moveDir);
    }
  }
  await fixSpriteDirs(method, spriteDirs, options);
  if (options.move) {
    fs.removeEmptyDirs(options.folder, { excludeRoot: true });
  }
}

/** Prepare and run sprite fixers, include setting up watchers if needed. */
export async function runFixer(
  method: SpritelyFixMethod | SpritelyFixMethod[],
  options: SpritelyCliGeneralOptions,
) {
  if (options.debug) {
    process.env.DEBUG = 'true';
    debug('DEBUG mode');
  }
  let debounceTimeout: NodeJS.Timeout | null = null;
  const pattern = path
    .join(options.folder, '**', '*.png')
    .split(path.sep)
    .join(path.posix.sep);
  const watcher = !options.watch
    ? null
    : chokidar.watch(pattern, {
        ignorePermissionErrors: true,
        awaitWriteFinish: {
          stabilityThreshold: 500,
          pollInterval: 100,
        },
      });
  let running = false;
  const run = async () => {
    // Prevent overlapping runs
    if (running) {
      debug('Attempted to run while already running.');
      return;
    }
    debug('Running fixer');
    running = true;
    await fixSprites(method, options);
    // Turn off the watcher and reboot!
    // (Apparently this is the cleanest way to manage this?)
    // await watcher?.close();
    // clearTimeout(debounceTimeout!);
    running = false;
    // if (options.watch) {
    //   runFixer(method, options);
    // }
  };
  if (!watcher) {
    return await run();
  }
  const debouncedRun = async () => {
    debug('Change detected, debouncing');
    clearTimeout(debounceTimeout!);
    debounceTimeout = setTimeout(run, 2000);
  };
  // Set up the watcher
  // Glob patterns need to have posix separators
  watcher
    .on('error', async (err: Error & { code?: string }) => {
      warning('Closing watcher due to error...');
      await watcher.close();
      throw err;
    })
    .on('add', debouncedRun)
    .on('change', debouncedRun)
    .on('unlinkDir', (dir) => {
      // If the root directory gets unlinked, close the watcher.
      if (path.resolve(dir) == path.resolve(options.folder)) {
        warning(
          'Watched directory deleted. Requires manual restart once the directory exists again.',
        );
        process.exit(1);
      }
    });
  await run();
}
