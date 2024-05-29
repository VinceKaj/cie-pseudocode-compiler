# cie-pseudocode-compiler
This unofficial CIE Pseudocode Compiler is a transpiler for Cambridge International A-level Computer Science Pseudocode. It converts pseudocode into JavaScript, which can later be executed as a standalone `.js` script.

The browser version can be found [**here**](http://vincekaj.ml/pseudocode).

<img width="1128" alt="cut" src="https://user-images.githubusercontent.com/35348750/194763691-3640c9d3-bdc6-42af-b43d-1e0d6635cc9b.PNG">

## How to use it

The full CIE Pseudocode guide can be found [here](https://github.com/VinceKaj/cie-pseudocode-compiler/raw/main/pseudocode_guide.pdf) \[PDF\] (from 2021).

**Note**: This project requires `node` and `npm`.

Installation and usage:

1. Clone this repository
2. Install dependencies with `npm install`
3. Write your Pseudocode script in `script.pc`
4. Run `npm start` to translate and execute your script

The program will translate your `script.pc` file into `compiled.js`, then execute the new JavaScript code.
