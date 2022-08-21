# cie-pseudocode-compiler
This unofficial CIE Pseudocode Compiler is a transpiler for Cambridge International A-level Computer Science Pseudocode. It converts pseudocode into JavaScript, which can later be executed as a standalone `.js` script.

The full CIE Pseudocode guide can be found [here](https://s3.us-west-2.amazonaws.com/secure.notion-static.com/77d9a87c-c43e-4945-90b2-769082d8eed4/pseudocode_guide.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=AKIAT73L2G45EIPT3X45%2F20220817%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20220817T104950Z&X-Amz-Expires=86400&X-Amz-Signature=f675a0191f424fe164ccba7be8ec1f5ae52a458a7f0c01c3eb2532478db5262e&X-Amz-SignedHeaders=host&response-content-disposition=filename%20%3D%22pseudocode_guide.pdf%22&x-id=GetObject) \[PDF\] (from 2021).

## How to use it

**Note**: This project requires `node` and `npm`. The browser version is **coming soon**.

Installation and usage:

1. Clone this repository
2. Install dependencies with `npm install`
3. Write your Pseudocode script in `script.pc`
4. Run `npm start` to translate and execute your script

The program will translate your `script.pc` file into `compiled.js`, then execute the new JavaScript code.

## Authors
This package was made by Vincentas Danys. More information can be found on the [YouTube video](https://www.youtube.com/channel/UCSCBRvbKafl1aFMvHQg3pug) I made.
If you would like to contribute or improve upon this package, feel free to create a [__new issue__](https://github.com/VinceKaj/cie-pseudocode-compiler/issues).
