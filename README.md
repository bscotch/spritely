# Spritely: Image correction and cleanup for 2D video game sprites

In the [Gamemaker Studio video game engine](https://www.yoyogames.com/gamemaker)
(<abbr title="Gamemaker Studio">GMS</abbr>), and presumably other 2D game engines,
game "sprites" are a collection of
subimages (also called frames, referred to by index in GMS via `image_index`).

These subimages may represent frames of an animation, or collection of animations,
that the game can cycle through. Frames within a sprite can also be used to create
alternate versions of a static asset, such as recolors or random variants.

**WARNING** This tool permanently changes your image files. Only use it if your
images are backed up somewhere. Take particular care when using recursive commands!

## About

Spritely aims to clean up subimages before you import them into your game
project, solving a few key problems:

+ Edge interpolation artifacts (faint outlines around rendered sprites)
+ Excessive padding (increases compiling time)

### Edge interpolation artifacts

You may notice some border artifacts around your sprites, especially when the camera
is not positioned in a pixel-perfect way (e.g. in GMS when the
"Interpolate colors between pixels" is set). This is caused by the engine computing
a weighted average between the border pixel's color and the color of the
neighboring pixels on the texture page, which are transparent black or white
(`rgba(0,0,0,0)` or `rgba(255,255,255,0)`).
So if the edge of your sprite is yellow and you are rendering the sprite at
a subpixel position, you'll get a faint one-pixel-wide
border drawn around your image that is much darker or brighter than the original edge.

![Edge artifacts when tiling with subpixel camera positioning.](https://github.com/bscotch/spritely/raw/main/docs/figure-edge-artifact.png)

*A tile (inset) showing edge-alias artifacts when the camera moves
by subpixel (left) or full pixel (right). Artifacts are present in both
cases, but much more pronounced with subpixel camera positioning.*

Spritely identifies the edge pixels and creates a border around them that is the
same color and mostly transparent, so that interpolation will not so dramatically
impact the edges of your images. We call this "<dfn>Alphalining</dfn>" (like
"outlining", but with a nearly-invisible line).

Note that you shouldn't be able to tell the difference *by eye* between
the original image and an alphalined image.

### Excessive padding

It's likely that your subimages consist of something meaningful drawn inside a
transparent rectangle. Excessive padding around the meaningful content adds more
pixels that Gamemaker must process when creating texture pages, so removing that
padding can dramatically speed up compiling.

Spritely crops your subimages to remove excess padding, but takes into account
all subimages in doing so to ensure that they are all cropped in the exact same
way. In effect, it creates a new bounding box based on the bounding boxes of
all subimages of a sprite.

![Figure with three panels described below.](https://github.com/bscotch/spritely/raw/main/docs/cropping.png)

The above figure demonstrates how Spritely crops sprites.
Panel <b>A</b> shows three subimages
of the same sprite, where the main content of each subimage takes up only a small
portion of the total subimage dimensions. Since the location of the content in
each subimage is different, cropping each subimage individually would result in
subimages of different sizes with inconsistent positioning relative to the original
sprite. Panel <b>B</b> shows how Spritely creates a bounding box taking the
content position of all subimages into account, with panel <b>C</b> showing the
cropped output.

## Installation

Requires [Node.js 14+](https://nodejs.org/en/).

In a terminal, run `npm install --global @bscotch/spritely`

## Usage

### Organizing your files

In order to correct your sprite subimages, they must be organized
into one folder per sprite, each containing the subimages making
up that sprite as immediate PNG children. **All subimages must have
the exact same dimensions.**

For example, you might have a sprite called `enemy` with three
subimages to create a run cycle. You would save these like this:

```sh
enemy/ # Folder representing the sprite
enemy/enemy-idle.png
enemy/enemy-run.png
enemy/enemy-sit.png
```

### Running commands (CLI)

Run spritely commands by opening up a terminal
(such as Powershell, cmd, Git Bash, bash, etc), typing in
`spritely COMMAND ...`, and hitting ENTER.

To find all the commands and options, run `spritely -h`. To get
more information about a specific command, run `spritely THE-COMMAND -h`.

For example, `spritely crop` will run the `crop` command, while
`spritely crop -h` will show you the help information for the `crop` command.

*Note that the <dfn>Current Working Directory</dfn> generally refers to
the folder in which you opened your terminal open.*

#### Examples

With the following file organization:

```sh
enemy/ # Folder representing the sprite
enemy/enemy-idle.png
enemy/enemy-run.png
enemy/leg/ # A subfolder representing another sprite related to 'enemy'
enemy/leg/leg-stand.png
enemy/leg/leg-walk.png
```

You could do the following (remember that **your files will be permanently changed** --
make sure you have backups!):

+ `spritely crop --folder enemy` will crop `enemy/enemy-idle.png` and `enemy/enemy-run.png`
+ `spritely crop -f enemy` is shorthand for the same thing
+ `spritely crop --recursive -f enemy` will find all nested folders, treating each as a sprite, so that `enemy/leg/leg-stand.png` and `enemy/leg/leg-walk.png` will also be cropped. **Use with caution!**
+ `spritely crop -r -f enemy` is shorthand for the same thing
+ `spritely crop -f "C:\User\Me\Desktop\enemy"` provides an *absolute* path if you are not currently in the parent folder of the `enemy` folder.
+ `spritely alphaline -f enemy` outlines the important parts of `enemy/enemy-idle.png` and `enemy/enemy-run.png` with nearly-transparent pixels to improve interpolation for subpixel camera positioning.
+ `spritely fix -f enemy` crops and alphalines the `enemy` sprite.
+ `spritely fix -f enemy --move somewhere/else` moves the sprite to `somewhere/else` after
  it has been processed. Also works recursively, with path provided to `--move` being used
  as the root directory. Note that old subimages in the target directory **are deleted** prior
  to moving the new ones, to ensure that the target directory has only the expected images.
  This feature is useful for pipelines where the presence/absence of images
  is used as an indicator for progress through the pipeline, or for export tools that
  refuse to overwrite existing images.
+ `spritely fix -f enemy --move somewhere/else --purge-top-level-folders` will delete
  top-level folders (immediate children of `--folder`) prior to moving changed images.
  This is useful for ensuring that any sprites deleted from the source also don't appear
  downstream.
+ `spritely fix -f enemy --root-images-are-sprites` causes any images directly in the root
  folder (`enemy`) to be treated as individual sprites, by putting each into their own
  folder. When used in combination with the `--recursive` flag, *only* the root-level images
  are treated this way (all others are treated as normal). This is useful for cases where
  sprites containing only one image are not exported by your drawing software into a folder,
  but only as a single image.

### Programmatic Usage

If you want to add Spritely functionality to a Node.js project,
you can import it into a Node/Typescript module.

The classes and methods are all documented via Typescript
and JSDocs, so you'll be able to figure out your options
using the autocomplete features of Typescript/JSDoc-aware
code editors like Visual Studio Code.

#### Spritely Instances

```ts
import {Spritely} from "@bscotch/spritely";
// or, for node/Javascript
const {Spritely} = require("@bscotch/spritely");

async function myPipeline(){
  const sprite = new Spritely('path/to/your/sprite/folder');

  // use async/await syntax
  await sprite.crop();
  await sprite.alphaline();

  // or use .then() syntax
  sprite.crop().then(cropped=>cropped.alphaline());
}
```

#### SpritelyBatch Instances

Pipelines likely require discovering many sprites instead of
only pointing at one specific sprite. Spritely includes a
`SpritelyBatch` class for discovering sprite folders and creating
a collection of Spritely instances from them.

```ts
import {SpritelyBatch} from "@bscotch/spritely";

const batch = new SpritelyBatch('path/to/your/sprite/storage/root');
// Get a shallow copy of the list of created Spritely instances
const sprites = batch.sprites;
```