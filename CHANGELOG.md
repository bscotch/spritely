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



