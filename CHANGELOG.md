## [1.3.1](https://github.com/bscotch/spritely/compare/v1.3.0...v1.3.1) (2020-11-16)


### Features

* Uncaught errors are no longer swallowed by Spritely. This was being used to write to errors to file for convenience, but has the side effect of swalling errors in projects depending on Spritely. ([a0da00f](https://github.com/bscotch/spritely/commit/a0da00fe178bb51cac0b750785f96c82a1589e84))



# [1.3.0](https://github.com/bscotch/spritely/compare/v1.2.1...v1.3.0) (2020-11-13)


### Features

* The 'gradmap' CLI command is now an alias for the 'skin' command, which is easier to grok. ([4f3d597](https://github.com/bscotch/spritely/commit/4f3d597fab2f2cbdc88962e16f468235a1b54dff))
* The gradient-map files for skinning now have a different (backwards-incompatible) format, allowing for re-use of skins based on image filename. ([fe22df2](https://github.com/bscotch/spritely/commit/fe22df2be6aa6fbd0f311f1e56529a7a5e9bb073)), closes [#19](https://github.com/bscotch/spritely/issues/19)



## [1.2.1](https://github.com/bscotch/spritely/compare/v1.2.0...v1.2.1) (2020-11-11)


### Features

* GradientMap application will now evaluate all discovered color channels in source images. ([d8cd674](https://github.com/bscotch/spritely/commit/d8cd674596903a4da439be98cb887ed21a6df859)), closes [#15](https://github.com/bscotch/spritely/issues/15)



# [1.2.0](https://github.com/bscotch/spritely/compare/v1.1.2...v1.2.0) (2020-11-11)


### Bug Fixes

* Color objects no longer expose the reference to their RGBA values array, instead always sending clones. This prevents accidental changes to color values that aren't refelected by other values in the Color instance. ([57d9794](https://github.com/bscotch/spritely/commit/57d97943ab5732106757a63aeb8f6bb623b02013))


### Features

* A 'Color' class now exits for more easily managing RGBA values. ([6e7178c](https://github.com/bscotch/spritely/commit/6e7178c4ebfb07efe0dd3ae04b7f528e59bdde49))
* A 'Color' class now exits for more easily managing RGBA values. ([1461975](https://github.com/bscotch/spritely/commit/14619752fec53ec63711ea23f18dfdd21262dabd))
* Allow subimage sizes to mismatch if requested. Ensure that cropping still works in this scenario. ([e7764b0](https://github.com/bscotch/spritely/commit/e7764b04a1395904488075d0b597c092c15d10ad)), closes [#13](https://github.com/bscotch/spritely/issues/13)
* Can now optionally delete source images upon application of Gradient Maps. ([ac0facc](https://github.com/bscotch/spritely/commit/ac0facccaf379e758f5f289e437f35553c993980))
* Gradient mapping can now use a manually-specified mapping file. ([c24fe21](https://github.com/bscotch/spritely/commit/c24fe21665ee3580be789e3eb7c3bc739fa59984))
* Gradient maps can now be applied via the CLI. ([70c08f7](https://github.com/bscotch/spritely/commit/70c08f7e56c15db253e2f6565c5cbe7a10b31650))
* GradientMaps (as YML files) are now loaded when Spritely instances are created. ([fe79ec8](https://github.com/bscotch/spritely/commit/fe79ec853cd014afc762de3e1817c91909702e5e))
* GradientMaps (as YML files) are now loaded when Spritely instances are created. ([8409504](https://github.com/bscotch/spritely/commit/8409504a3dcd9dd99c6442039b56534698ffdab4))
* Several static methods are now marked private, since there is no need to expose them outside the Spritely class. ([e49dc8a](https://github.com/bscotch/spritely/commit/e49dc8a18edd52e0a724f3e432b660d8fe337bda))
* Several static methods are now marked private, since there is no need to expose them outside the Spritely class. ([2c38913](https://github.com/bscotch/spritely/commit/2c389131b2f53f6fb8b1c96604dc51ee1b02a364))
* Spritely instances can now apply gradient maps, creating new images as a consequence. ([d76493b](https://github.com/bscotch/spritely/commit/d76493bf94d804580b301f04c06e7748754e7dc3)), closes [#14](https://github.com/bscotch/spritely/issues/14)
* Spritely instances now allow for an options object (backwards compatible). ([08e8b3e](https://github.com/bscotch/spritely/commit/08e8b3ef01bd13a8522a42ab0911bab5626844be))
* The Color class now includes a 'toJSON' method. ([acc19cb](https://github.com/bscotch/spritely/commit/acc19cb17e8cfc8a29dfdb1bdadc64b396b74455))
* The Color class now includes a 'toJSON' method. ([0e520de](https://github.com/bscotch/spritely/commit/0e520de666526554f7a67629d80d42c786c22bbd))
* The test samples now include images for testing GradientMaps. ([bd94100](https://github.com/bscotch/spritely/commit/bd94100fb40d18419c9da0db96dadac215979c96))
* The test samples now include images for testing GradientMaps. ([84fdb41](https://github.com/bscotch/spritely/commit/84fdb4164280bbdddcc2c9e2c8634fbbc66c2a70))



## [1.1.2](https://github.com/bscotch/spritely/compare/v1.1.1...v1.1.2) (2020-10-26)


### Bug Fixes

* The now-unused 'chokidar' is no longer a dependency. ([0663120](https://github.com/bscotch/spritely/commit/06631200bec643de2b0fb8a38e83ea0425c99e95))



## [1.1.1](https://github.com/bscotch/spritely/compare/v1.1.0...v1.1.1) (2020-10-16)



# [1.1.0](https://github.com/bscotch/spritely/compare/v1.0.0...v1.1.0) (2020-10-16)


### Features

* Thrown errors are now logged prior to crashing Spritely, so that error data is not lost when pipelines complete. ([35523bd](https://github.com/bscotch/spritely/commit/35523bd50e07020c56ba7e78c99bc5f7db83b02a))



# [1.0.0](https://github.com/bscotch/spritely/compare/v0.9.0...v1.0.0) (2020-10-16)


### Features

* 'Alphaline' is now rnamed to 'bleed' in all contexts to match industry terminology. Breaking change. ([1bfa8ed](https://github.com/bscotch/spritely/commit/1bfa8ed8024c7217e7a44a64b368fcb028a6e0f8))



# [0.9.0](https://github.com/bscotch/spritely/compare/v0.8.2...v0.9.0) (2020-10-15)


### Features

* CLI commands now include the if-match option to only perform tasks on sprites matching a search filter. ([227be13](https://github.com/bscotch/spritely/commit/227be13651ae190a1fb0c3ba43e8cb89f5855a33))



## [0.8.2](https://github.com/bscotch/spritely/compare/v0.8.1...v0.8.2) (2020-10-15)


### Bug Fixes

* Purging top level folders no longer crashes when those folders don't exist in the move target. ([0bfe821](https://github.com/bscotch/spritely/commit/0bfe821075d7c4fe24e464b4316c4dac632bfcf1))



## [0.8.1](https://github.com/bscotch/spritely/compare/v0.8.0...v0.8.1) (2020-10-15)


### Bug Fixes

* CLI tools now properly clean up empty folders after moving sprite images. ([671c920](https://github.com/bscotch/spritely/commit/671c920c2cb00c9f2c6daf3952ab68494d282247))



# [0.8.0](https://github.com/bscotch/spritely/compare/v0.7.0...v0.8.0) (2020-10-14)


### Features

* CLI commands now include the option to purge top-level folders prior to moving modified images. Closes [#9](https://github.com/bscotch/spritely/issues/9) ([223d799](https://github.com/bscotch/spritely/commit/223d799da6cbb3cfa35e0e0923412c77eafd84b1))



# [0.7.0](https://github.com/bscotch/spritely/compare/v0.6.0...v0.7.0) (2020-10-14)


### Features

* CLI commands now include an option to move root-level images into sprite folders. Closes [#6](https://github.com/bscotch/spritely/issues/6) ([b669c39](https://github.com/bscotch/spritely/commit/b669c3903082191210fed54a842682ef757d0af4))
* The --watch option is no longer available for CLI commands. It's behavior was too fragile and it added too much complexity to be worth keeping around. ([e8664b2](https://github.com/bscotch/spritely/commit/e8664b2784e0dcee5d409433b19a70f77c40c77f))



# [0.6.0](https://github.com/bscotch/spritely/compare/v0.5.0...v0.6.0) (2020-10-13)


### Features

* A new SpritelyBatch class allows for easy conversion of a folder of sprite resources into a colletion of Spritely instances. ([429fa1a](https://github.com/bscotch/spritely/commit/429fa1acc1de947bfb153bf15ca3eb477c35d573))



# [0.5.0](https://github.com/bscotch/spritely/compare/v0.4.2...v0.5.0) (2020-10-12)


### Features

* Moving a sprite now cleans up empty directories left behind, and ensures there aren't any unexpected images in the destination. ([5209447](https://github.com/bscotch/spritely/commit/52094475819e0aee3aa51f75a9d6a2212e874d0f))



## [0.4.2](https://github.com/bscotch/spritely/compare/v0.4.1...v0.4.2) (2020-10-12)


### Features

* CLI users can now use the --move option for all commands. ([60ec154](https://github.com/bscotch/spritely/commit/60ec15425afe3e06d74320bc72124c15a76dc96e))
* Spritely instances can now move and delete their subimages. ([cb17b47](https://github.com/bscotch/spritely/commit/cb17b47927fe3eef5f7aecb1a31d386f5f2c3879))
* The 'fix' subcommand now allows the --move option, moving fixed images to a different file location. ([72935c8](https://github.com/bscotch/spritely/commit/72935c8dea67e12d569f6c0ae0c691b7f69e1164))



## [0.4.1](https://github.com/bscotch/spritely/compare/v0.4.0...v0.4.1) (2020-10-12)



# [0.4.0](https://github.com/bscotch/spritely/compare/v0.3.3...v0.4.0) (2020-10-12)



## [0.3.3](https://github.com/bscotch/spritely/compare/v0.3.2...v0.3.3) (2020-10-12)


### Bug Fixes

* The recursion CLI flag will actually allow for recursion. ([79f2f7b](https://github.com/bscotch/spritely/commit/79f2f7bfa5d4e6eb5f20a205bf66889f28e7619e))


### Features

* Include sample images with nesting to test against recursion. ([0216178](https://github.com/bscotch/spritely/commit/02161789bccf7b1aaa42d7eeb71d5655d3700eae))
* Spritely can now compute checksums based on pixel data, ignoring metadata, to make image comparison meaningful. ([0d109de](https://github.com/bscotch/spritely/commit/0d109de6562b27e9156b9503c2c8d5badf441f45))



## [0.3.2](https://github.com/bscotch/spritely/compare/v0.3.1...v0.3.2) (2020-10-12)


### Bug Fixes

* Commandline options will not longer fail due to missing chokidar error. ([3e66f14](https://github.com/bscotch/spritely/commit/3e66f14357c73670d0c817b75ea189442fe3d803))



## [0.3.1](https://github.com/bscotch/spritely/compare/v0.3.0...v0.3.1) (2020-10-09)



# [0.3.0](https://github.com/bscotch/spritely/compare/v0.2.0...v0.3.0) (2020-10-09)


### Bug Fixes

* Change how image foreground is detected so that alphalining the same image twice has the same result as doing so once. Closes [#3](https://github.com/bscotch/spritely/issues/3). ([3d3ea0a](https://github.com/bscotch/spritely/commit/3d3ea0a2f2225a4cf56aa17a1e3d841059a9b9a3))


### Features

* Add watcher option to sprite-alphaline command. ([cdf1fbc](https://github.com/bscotch/spritely/commit/cdf1fbc5371d40b81ecb721353d264fd9ebc90e0))
* Add watcher option to sprite-crop command. ([e994c65](https://github.com/bscotch/spritely/commit/e994c652170aa45a5b65bdf3543b51f55f98b047))
* Add watcher option to spritely-fix CLI command. ([2ce71ee](https://github.com/bscotch/spritely/commit/2ce71ee99bfdff5f4436302257962036721a6ebd))



# [0.2.0](https://github.com/bscotch/spritely/compare/v0.1.3...v0.2.0) (2020-10-09)


### Features

* Add static method to Spritely class for checking two images for equality. ([7887862](https://github.com/bscotch/spritely/commit/7887862642be1b0323fdefbc12a40b7537ce3bad))
* Add tests to ensure that cropping and alphalining actually do what they're supposed to. Closes [#1](https://github.com/bscotch/spritely/issues/1). ([d6e2ff7](https://github.com/bscotch/spritely/commit/d6e2ff7421ea7d4f2beb944907c28982a972d6ab))
* Create funding file. ([1cf2e7e](https://github.com/bscotch/spritely/commit/1cf2e7ebf6c5d76177706753afaa981df130c4a4))
* Replace Sharp-based cropping with custom cropping using image-js, using alpha-zero pixels to define background. Closes [#2](https://github.com/bscotch/spritely/issues/2) ([05d1300](https://github.com/bscotch/spritely/commit/05d1300dc118f0dfd63456f9cf79077d27cd0f1c))



## [0.1.3](https://github.com/bscotch/spritely/compare/v0.1.2...v0.1.3) (2020-10-08)


### Bug Fixes

* The alphaline script is calling crop instead of alphaline. ([e86968d](https://github.com/bscotch/spritely/commit/e86968d7aafd201fc436689b7f0bd3f7c600ed5b))



## [0.1.2](https://github.com/bscotch/spritely/compare/v0.1.1...v0.1.2) (2020-10-08)



## [0.1.1](https://github.com/bscotch/spritely/compare/v0.1.0...v0.1.1) (2020-10-08)



# [0.1.0](https://github.com/bscotch/spritely/compare/9b6be8d92e647008fd74b9a3f42151bbecb1c05b...v0.1.0) (2020-10-08)


### Features

* Add CLI command for alphaling sprites. ([b40575a](https://github.com/bscotch/spritely/commit/b40575a699f7aa52b72f1553d4f0b09336770c94))
* Add CLI command for cropping sprites, allowing it to work recursively for batching. ([27d2ccf](https://github.com/bscotch/spritely/commit/27d2ccfba882318b446af07a7fd96eb225eda05a))
* Add CLI command for generally fixing sprites (performing all tasks at once). ([0d3b061](https://github.com/bscotch/spritely/commit/0d3b061d890b6c7a3b16d414cef7a39668706e28))
* Draft the main 'Spritely' class that can be pointed at a folder of images and get information about those images, while failing if there is anything weird detected. ([1b5cca4](https://github.com/bscotch/spritely/commit/1b5cca47aa88502f894b79c5462a82765254a691))
* Implement cropping that takes subimages into account for consistent cross-subimage cropping. ([3d26e00](https://github.com/bscotch/spritely/commit/3d26e00723224705b8700b1b1ea659f32881b00f))
* Implement fixing sprite edges. ([c7e1ccb](https://github.com/bscotch/spritely/commit/c7e1ccbdd6a0c5565597e16e02b66f1429d25048))
* Initialize project with drafted README as reference. ([9b6be8d](https://github.com/bscotch/spritely/commit/9b6be8d92e647008fd74b9a3f42151bbecb1c05b))



