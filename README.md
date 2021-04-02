## Synopsis

**mfei** - the name originated from **M**icro **F**ront-**E**nd solution based on **I**frame, but it is actually a cross-domain communication framework based on iframe, such that you can use it anywhere that iframe solutions occur

> _note_: this library has no dependencies except that it relies `Promise`, you should add polyfill if you need to support old browsers

## Install

`npm install mfei` or `yarn add mfei`

## Usage

see [examples](https://github.com/silenaker/mfei/tree/master/examples)

you can clone this repo and change directory to examples and its subdirectories, install dependencies use `yarn` or `npm` respectively, you should run `npm start` in _base_ directory firstly and then run start in _apple_ directory

examples structure

- _base_: the main application page that loads _apple_ service use mfei
- _apple_: the service page that registers some request handlers, use request origin to authenticate/authorize

if you want to see class or parameters deeply, please refer to type definitions in source code directly thanks to the tiny codebase

## License

MIT
