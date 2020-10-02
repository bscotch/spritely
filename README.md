# Spritely: Image correction and cleanup for 2D video game sprites

In the [Gamemaker Studio video game engine](https://www.yoyogames.com/gamemaker)
(<abbr title="Gamemaker Studio">GMS</abbr>), and presumably other 2D game engines,
game "sprites" are a collection of
subimages (also called frames, referred to by index in GMS via `image_index`).

These subimages may represent frames of an animation, or collection of animations,
that the game can cycle through. Frames within a sprite can also be used to create
alternate versions of a static asset, such as recolors or random variants.

## About

Spritely aims to clean up subimages before you import them into your game
project, solving a few key problems:

+ Edge artifacts (faint outlines)
+ Excessive padding (increases compiling time)

### Edge artifacts

You may notice some border artifacts around your sprites, especially when the camera
is not positioned in a pixel-perfect way (e.g. in GMS when the
"Interpolate colors between pixels" is set). This is caused by the engine computing
a weighted average between the border pixel's color and the color of the
neighboring pixels on the texture page, which are transparent black
(rgba(0,0,0,0)). So if the edge of your sprite is yellow you'll get a faint one-pixel-wide
border drawn around your image that is darker than the original edge.

![Edge artifacts when tiling with subpixel camera positioning.](./docs/figure-edge-artifact.png)

*A tile (inset) showing edge-alias artifacts when the camera moves
by subpixel (left) or full pixel (right). Artifacts are present in both
cases, but much more pronounced with subpixel camera positioning.*

Spritely identifies the edge pixels and creates a border around them that is the
same color and mostly transparent, so that interpolation will not so dramatically
impact the edges of your images.

### Excessive padding

It's likely that your subimages consist of something meaningful drawn inside a
transparent rectangle. Excessive padding around the meaningful content adds more
pixels that Gamemaker must process when creating texture pages, so removing that
padding can dramatically speed up compiling.

Spritely crops your subimages to remove excess padding, but takes into account
all subimages in doing so to ensure that they are all cropped in the exact same
way. In effect, it creates a new bounding box based on the bounding boxes of
all subimages of a sprite.

## How to use Spritely

### Dependencies

+ [Node.js 14+](https://nodejs.org/en/)

### Installation

In the commandline, run `npm install --global @bscotch/spritely`

### Usage

Run spritely commands via the commandline by opening up a terminal
(such as Powershell, cmd, Git Bash, bash, etc) typing in
`spritely COMMAND ...`, and hitting ENTER.

To find all the commands and options, run `spritely -h`. To get
more information about a specific command, run `spritely THE-COMMAND -h`.

*Note that the <dfn>Current Working Directory</dfn> generally refers to
the folder in which you have your terminal open.*

## How it works

### Removing edge artifacts

