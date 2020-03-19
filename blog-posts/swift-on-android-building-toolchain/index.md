---
published: false
title: "Swift on Android: Building toolchain"
date: 2018-12-26
cover_image: "https://raw.githubusercontent.com/vgorloff/mc-blog/master/blog-posts/swift-on-android-building-toolchain/victor-benard-588604-unsplash.jpeg"
description:
tags: swift, android
series:
canonical_url:
---

One day in December 2018 I decided to repeat steps written in [Android.md](https://github.com/apple/swift/blob/master/docs/Android.md) readme-file from official Apple Swift [Git repository](https://github.com/apple/swift). Final goal was to experiment with Swift programming language on Android device I have.

![Featured image](./victor-benard-588604-unsplash.jpeg 'Swift on Android: Building toolchain')

Photo by [Victor Benard](https://unsplash.com/@vics_pics) on [Unsplash](https://unsplash.com/)

At that point of time Swift runtime on Linux was able to utilise Dispatch and Foundation frameworks. There were also various examples (like one from [Readdle](https://blog.readdle.com/why-we-use-swift-for-android-db449feeacaf)) how to build Swift toolchain (including Dispatch and Foundation frameworks) for Android.

After first attempts of building Swift compiler, Dispatch and Foundation frameworks it became clear that official [Android.md](https://github.com/apple/swift/blob/master/docs/Android.md) readme-file is not up to date. Other examples were either outdated (outdated NDK version or Swift version) or literally wasn’t working due execution errors in Shell scripts (like missed dependency or file).

That’s why I decided to make Automated workflow to build Swift toolchain which is easy to maintain and keep up to date. To avoid Shell programming I decided to use [Ruby](https://www.ruby-lang.org/) programming language for general purpose scripting.

After about three weeks of research the initial version of Automated workflow was made. It called [“Swift-Everywhere”](https://github.com/vgorloff/swift-everywhere-toolchain). It can build Swift version capable to generate Arm and Intel 32/64 bit binaries.

## Using Pre-built Swift toolchain

Since [Release](https://github.com/vgorloff/swift-everywhere-toolchain/releases) 1.0.14 it is possible to download and use pre-build toolchain. It supports `aarch64`, `arm`, `x86` and `x86_64` architectures.

Since Swift toolchain depends of Android NDK it needs to be configured before first usage. How to do it described in `Readme.md` file included into downloadable archive. In short — you need to make symbolic link which points to Android NDK. Below you can find file structure of the Swift toolchain:

```none
$TOOLCHAIN/
          /ndk                (Symbolic link to Android NDK)
          /bin                (Swift compiler)
          /lib/swift/android  (Pre-built Shared Objects)
          /share              (Licenses, etc.)
          /VERSION
          /Readme.md
```

Inside `bin` directory there are several versions of swift compiler. Also there are several versions of helper `copy-libs` scripts which can be used in order to copy shared objects to desired location (i.e. `jniLibs` folder). As you can see below the difference only in target tripple suffix which defines for which target platform swift should generate the code.

```none
$TOOLCHAIN/bin/
              /copy-libs-aarch64-linux-android
              /copy-libs-arm-linux-androideabi
              /copy-libs-i686-linux-android
              /copy-libs-x86_64-linux-android
              /swiftc-aarch64-linux-android
              /swiftc-arm-linux-androideabi
              /swiftc-i686-linux-android
              /swiftc-x86_64-linux-android
```

To compile Swift source code and deploy to Android Device do following:

1. Compile:

   `$TOOLCHAIN/bin/swiftc-i686-linux-android -emit-executable -o [destination]/hello main.swift`

2. Copy pre-built dependencies:

   `$TOOLCHAIN/bin/copy-libs-i686-linux-android [destination]`

3. Copy dependencies and executable to Android Device (or Simulator):

   `adb push [destination]/hello, [destination]/libswiftGlibc.so, …`

4. Run executable on Android Device:

   `adb shell LD_LIBRARY_PATH=/data/local/tmp /data/local/tmp/hello`

See [Samples projects](https://github.com/vgorloff/swift-everywhere-toolchain/tree/develop/Projects) for details.

## Building Swift toolchain (including Dispatch and Foundation frameworks) for Android

The process is automated. All you need to do is to launch command `make`. It will show available build targets similar to shown below:

```sh
$ make

To Build Toolchain with One-Action:

$ make bootstrap

To Build Toolchain Step-by-Step:

1. Checkout sources:
   $ make checkout

2. Build toolchain:
   $ make build

3. Install toolchain:
   $ make install

4. Archive toolchain:
   $ make archive

Building certain component (i.e. llvm, icu, xml, ssl, curl, swift, dispatch, foundation):

To build only certain component:
   $ make build:llvm

To clean only certain component:
   $ make clean:llvm
```

At the moment in order to build Swift toolchain (including Dispatch and Foundation frameworks) and sample projects you need to do following steps:

1. Get sources of components such as LLVM, Swift, ICU, libXML, CURL, etc.
2. Install [Android Studio](https://developer.android.com/studio/) from Google website and enable [NDK](https://developer.android.com/ndk/guides#download-ndk) Tool.
3. Build [LLVM](https://llvm.org/) Compiler Infrastructure.
4. Build Dependencies such as ICU, libXML, CURL, etc.
5. Build [Swift](https://swift.org/about/) Compiler Infrastructure.
6. Build [Dispatch](https://github.com/apple/swift-corelibs-libdispatch) and [Foundation](https://github.com/apple/swift-corelibs-foundation) frameworks.

All steps above automated. Once build is done you can Build sample projects included into separate [repository](https://github.com/vgorloff/swift-everywhere-samples) and deploy them to Android device. Detailed steps described in `Readme.md` files included into [repository](https://github.com/vgorloff/swift-everywhere-samples) with sample projects.

## How Automated workflow works

As you see workflow for building Swift toolchain is automated. But you may interesting what inside and how it works.

### Dependencies and Build steps

At first we can build Foundation dependencies such as ICU, libXML, libCURL, OpenSSL. Then we can build Swift compiler, Dispatch and Foundation. Swift compiler build will also trigger LLVM and CMark builds.

Here is a structure of dependencies:

- Swift compiler → LLVM, CMark.
- LLVM → Compiler-RT, Clang.
- Dispatch → LLVM, Swift compiler.
- Foundation → LLVM, Swift compiler, Dispatch, ICU, libXML, libCURL
- libCURL → OpenSSL

### Patches and Fixes

Not everything “Out of the Box” yet. As you can see Git repository contains [patches](https://github.com/vgorloff/Android-On-Swift/tree/master/Patches) for several components used during build process. Swift development is in active phase and often you can find code like below:

```swift
// File: FileManager.swift
func mountPoints(_ statBufs: UnsafePointer<statfs>,
                 _ fsCount: Int) -> [URL] {
   ...
   #error("Requires a platform-specific implementation")

   ...
}
```

Surprise! Type `FileManager` still has non implemented function `mountPoints` for Android. Of cause later someone (maybe you) will implement function body. But without applying patch Foundation framework will not be compilable.

#### ICU Patches

[Patches](https://github.com/vgorloff/Android-On-Swift/tree/master/Patches/icu) needed to avoid conflicts and unexpected behaviour of Swift runtime. ICU library needs to be altered with “swift” suffix. So, that ICU library name will be `libicui18nswift.so` instead of `libicui18n.so` which is shipped with Android.

#### Dispatch Patches

First [patch](https://github.com/vgorloff/swift-everywhere-toolchain/tree/develop/Patches/swift-corelibs-libdispatch/cmake/modules) contains `CMAKE_SYSTEM_PROCESSOR` fix addressed wrong architecture determination. **(TODO)** This can be easily fixed and merged to Swift codebase.

Second [patch](https://github.com/vgorloff/swift-everywhere-toolchain/tree/develop/Patches/swift-corelibs-libdispatch/cmake/modules) removes `-Werror` compiler flag. Without this patch compiler will fail with error due warning. **(TODO)** Source code needs modification to avoid warnings. After updating sources this patch can be removed.

#### Foundation Patches

First [patch](https://github.com/vgorloff/swift-everywhere-toolchain/tree/develop/Patches/swift-corelibs-foundation) contains `CMAKE_SYSTEM_PROCESSOR` fix addressed wrong architecture determination. **(TODO)** This can be easily fixed and merged to Swift codebase.

Second series of patches addressed compiler defines similar to `DEPLOYMENT_TARGET_ANDROID`, `ICU_LIBRARY`, `os(Android)` or compile options like `-fcf-runtime-abi=swift`.

`FileManager.swift` file contain most of the patches. Certain functions not yet implemented. So, it is a pure workaround in order to get build Foundation. **(TODO)** Appropriate bug submitted to Swift developers.

Fix for missed `__CFConstantStringClassReference` symbol is most interesting. Without it you can build Swift toolchain, but demo project will fail to execute upon dynamic linking due missed symbol.

```sh
-Xlinker --defsym -Xlinker '__CFConstantStringClassReference=$$s10Foundation19_NSCFConstantStringCN'
```

_Note_ that Swift symbol in example below is `$s10Foundation19_NSCFConstantStringCN`. But we need to use double dollar symbol `$$` to escape.

## Future plans

Primary goal is to keep up to date Automated workflow. Actually it is easy to do. It requires changing SHA commits in checkout configuration, rebuilding Swift toolchain and releasing new version of Automated workflow on GitHub.

Next goal is to fix shell scripts from Swift repository. So that after following steps from [Android.md](https://github.com/apple/swift/blob/master/docs/Android.md) readme-file you should be able to get Swift toolchain for Android. This require to promote needed changes to Swift sources and get rid of patches. After that updating shell scripts and Readme files from Swift sources will be a trivial task.

Ideally we need to achieve automated builds for Swift toolchain for Android on official [Swift CI](https://swift.org/continuous-integration/) system.

If you can help with patches, especially by implementing missed parts of `FileManager.swift` file for Android system, then go ahead fork Swift Git repository, implement changes and make pull request.

Thank you!

## Updates

### Release 1.0.18–28 May 2019

[Release](https://github.com/vgorloff/swift-everywhere-toolchain/releases) based on Swift 5.1. It contains less patches than were in Swift 5.0. Especially due new functionality which was implemented in Foundation library.

### Release 1.0.15–10 May 2019

[Release](https://github.com/vgorloff/swift-everywhere-toolchain/releases) enables x86_64 platform. As before it is available to download as pre-built distributable package.

### Release 1.0.14–9 May 2019

[Release](https://github.com/vgorloff/swift-everywhere-toolchain/releases) now available as pre-built distributable package. It can be downloaded and used to compile swift source code without need to compile toolchain itself.

### Release 1.0.13–7 May 2019

[Release](https://github.com/vgorloff/swift-everywhere-toolchain/releases) provides full support for 3 architectures (arm, aarch64, x86) in all toolchain components (including Dispatch and Foundation). When launching x86 build on Android Simulator, it still have runtime issue due missed `pthread_setname_np` symbol. Seems this is addressed wrong build settings in Swift core libraries and/or in `libFoundation` due missed `__ANDROID_API__` define.

### Release 1.0.7 — 8 March 2019

[Release](https://github.com/vgorloff/swift-everywhere-toolchain/releases) adds support for Swift 5 and Android NDK v19. Build workflow was updated to avoid usage of NDK Standalone toolchains as recommended in NDK release notes. Some patches removed due same configuration achieved by more precise CMake settings.

### Release 1.0.4 — 29 December 2018

[Release](https://github.com/vgorloff/swift-everywhere-toolchain/releases) removes dependency in `SwiftBuilder` from `build-script/build-script-impl` Python build script. It will allow to use only `CMake / Make` tools for building LLVM/Clang and Swift. Also added partial support of building Swift toolchain on macOS instead of Ununtu Linux. This will help to achieve faster builds in upcoming releases.
