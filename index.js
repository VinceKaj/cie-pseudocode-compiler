const fs = require('fs');

let lineCounter = 0;
const error = (str) => {
  // throw(`Error at script.pc:${lineCounter}: ${str}`)
  console.error(`${pcLines[lineCounter-1]}\n\nError: ${str}\n    at script.pc:${lineCounter}`);
  process.exit(1);
};

/* These words are reserved by the pseudocode language. Each declaration is checked for clashes. */
const ReservedWords = [
  '&', '*', '+', '-', '/', '//', '<', '<-', '<=', '<>', '=', '>', '>=', 'AND', 'APPEND', 'ARRAY', 'BOOLEAN', 'BYREF', 'BYVAL', 'CALL', 'CASE OF', 'CHAR', 'CLASS', 'CLOSEFILE', 'CONSTANT', 'DATE', 'DECLARE', 'DIV', 'ELSE', 'ENDCASE', 'ENDCLASS', 'ENDFUNCTION', 'ENDIF', 'ENDPROCEDURE', 'ENDTYPE', 'ENDWHILE', 'EOF', 'FALSE', 'FOR', 'FUNCTION', 'IF', 'INHERITS', 'INPUT', 'INT', 'INTEGER', 'LCASE', 'LEFT', 'LENGTH', 'MID', 'MOD', 'NEW', 'NEXT', 'NOT', 'OPENFILE', 'OR', 'OTHERWISE', 'OUTPUT', 'PRIVATE', 'PROCEDURE', 'PUBLIC', 'PUTRECORD', 'RAND', 'RANDOM', 'READ', 'READFILE', 'REAL', 'REPEAT', 'RETURN', 'RETURNS', 'RIGHT', 'SEEK', 'STEP', 'STRING', 'SUPER', 'THEN', 'TO', 'TRUE', 'TYPE', 'UCASE', 'UNTIL', 'WHILE', 'WRITE', 'WRITEFILE', '^'
];

/* The built-in JS typeof operator doesn't specify enough types, so this custom function fills-in the rest */
const TypeOf = (x) => {
  try { x = eval(x) } catch (e) {} // convert string into actual value

  if (typeof(x) == 'string' && x.length === 1) return 'char';
  if (typeof(x) === 'number') return (x % 1 === 0 ? 'int' : 'float');
  return typeof(x);
}

/* This object stores and validates all identifiers within a pseudocode script whilst translating to check for errors */
/* TODO: update the checks system with getters and setters for readability and accuracy */
const checks = {

  identifiers: {}, // a list of all pseudocode user-declared identifiers
  files: {},

  identityCheck: (name, file=false) => { // called each time a new identifier is declared
    if (ReservedWords.includes(name)) error(`Identifier cannot have name ${name}`);
    if (!file && checks.identifiers[name]) error(`Cannot re-define identifier '${name}'`);
  },

  addVar: (name, value, varType, constant=false) => {
    checks.identityCheck(name);
    if (value * 1 == value) value *= 1 // convert numbers into numbers
    checks.identifiers[name] = {prop: "var", value, type: (varType || TypeOf(value)), constant: constant};
  },

  addFile: (name, state) => {
    checks.identityCheck(name, true);
    if (!["READ", "WRITE", "APPEND"].includes(state)) error(`No such file operator '${state}'`);
    if (checks.files[name] && checks.files[name].state !== "closed")
      error('Cannot open an already open file');
    checks.files[name] = {state};
  },

  closeFile: (name) => {
    if (!checks.files[name] && checks.files[name].state === "closed")
      error("Cannot close a file that isn't open");
    checks.files[name].state = "closed";
  },

  addArray: (name, type, dimensions) => {
    checks.identityCheck(name);
    checks.identifiers[name] = {prop: "array", type, dimensions};
  }
}

/* This is an outdated function. Needs to be replaced soon */
/* GetFileName(str): for a line of pseudocode, try to match either an identifier name or a "string" */
const GetFileName = (str) => {
  let match = str.match(/"(.+)"/); // try to match string filename. E.g.: "filename.txt"
  if (match)
    return `"${match[1]}"`; // return 'filename.txt'
  if (str.split(' ')[1]?.match(/[\w ]+/))
    return str.split(' ')[1]?.match(/[\w ]+/)[0]; // if there isn't a string, return it as a variable. E.g.: filename
  else return null;
}

/* This function is outdated. Once all JS types are converted to pseudocode types, this function can be removed */
/* Converts types between JS and pseudocode */
function ConvertType(type) {
  switch (type) {
    case "INTEGER": return "int";
    case "REAL": return "float";
    case "STRING": return "string";
    case "BOOLEAN": return "boolean";
    case "ARRAY": return "object";
    default: error(`Unknown type '${type}'`);
    // TODO: add custom Pseudocode types
  }
}

function ConvertLine(line) {

  const identifier = GetFileName(line);
  let split = line.split(' ');
  let varType;

  switch (split[0]) {
    case "DECLARE": {

      /* Deal with arrays */
      if (line.includes("ARRAY")) {

        let [identifiers, ...typeArgs] = line.split(/ ?\: ?/g); // colon split (space sensitive)
        identifiers = identifiers.split(/ ?, ?|DECLARE /g).splice(1); // comma split, remove "DECLARE"
        typeArgs = typeArgs.join(':'); // spaces 
        
        const arrType = ConvertType(typeArgs.split(' ').pop());
        let dimensions = typeArgs.match(/\[(.+)\]/)[1].split(/ ?, ?/g).reverse(); // match everything between square brackets, split into separate dimensions
        let constructorStr = "null";

        dimensionsArr = [];

        dimensions.forEach(d => {
          let [min, max] = d.split(/ ?\: ?/);
          if (min*1 == min && max*1 == max && min*1 > max*1) error(`Range of array cannot be backwards (reading: lower ${min}, upper ${max})`);
          if (max*1 == max && (max % 1 !== 0 || max*1 < 0)) error('Upper bound must be a non-negative integer');
          if (min*1 == min && (min % 1 !== 0 || min*1 < 0)) error('Lower bound value must be a non-negative integer');

          constructorStr = `_.Array(${min}, ${max}, ${constructorStr})`;
          dimensionsArr.push([min,max]);
        })

        let returnArr = [ ];

        identifiers.forEach(i => {
          returnArr.push(`const ${i} = ${constructorStr}`);
          checks.addArray(i, arrType, dimensionsArr);
        });

        return returnArr.join('\n');
      }

      /* Non-array declarations */

      split = line.split(/(?: ?\: ?| ?,? )/g); // split at " : " OR "," OR " "
      varType = ConvertType(split.pop()); // convert Pseudocode type to JS type
      const vars = split.splice(1); // ignore first element: "DECLARE"
      vars.forEach(v => checks.addVar(v, null, varType));
      return `let ${vars.join(', ')}`;
    }
    case "CONSTANT": {
      let statement = line.replace(/CONSTANT/, 'const').replace(/===/g, '=');
      let val = eval(statement + `; ${split[1]}`);
      checks.addVar(split[1], val, TypeOf(val), true); // saves the constant, to record its changes
      return `const ${split[1]} = ${TypeOf(val) === 'string' ? `"${val}"` : val}`;
    }
    case "TYPE": {

    }
    case "PROCEDURE": {
      let match = line.match(/\((.+)\)/);
      if (!match) return `function ${split[1]}() {`

      let parSplit = match[1].split(' , ');
    
      parameters = [];
      parSplit.forEach(param => {
        let varSplit = param.split(' ');
        let varName = (['BYREF', 'BYVAL'].includes(varSplit[0]) ? varSplit[1] : varSplit[0]); // if there's a BYREF or BYVAL, ignore it
        varType = ConvertType(varSplit.pop());
        checks.addVar(varName, null, varType);
        parameters.push(varName);
      });
      checks.identifiers[split[1]] = {prop: "procedure", name: split[1]};
      return `function ${split[1]}(${parameters}) {` // make function header with all paramters
    }
    case "CALL": {
      if (checks.identifiers[split[1]].prop !== "procedure") error("CALL keyword is reserved for procedures only")
      if (!line.endsWith(")")) split.push("()"); // pseudocode procedures can be called without (); this adds ()
      return `${split.slice(1).join('')}`;
    }
    case "FUNCTION": {
      let match = line.match(/\((.+)\)/);
      if (!match) return `function ${split[1]}() {`

      let parSplit = match[1].split(' , ');

      let returnType = split.pop();

      checks.identifiers[split[1]] = {prop: "function", name: split[1], type: ConvertType(returnType)};
    
      parameters = [];
      parSplit.forEach(param => {
        let varSplit = param.split(' ');
        varType = ConvertType(varSplit.pop());
        checks.addVar(varSplit[0], null, varType);
        parameters.push(varSplit[0]);
      });
      return `function ${split[1]}(${parameters}) {` // make function header with all paramters
    }
    case "IF": {
      let last = split.pop();
      split.push((last == "{" ? ") {" : `${last})`));
      return `if(${split.slice(1, split.length).join(' ')}`;
    }
    case "FOR": {
      let [func, i, min, max] = line.split(/(?: ?<- ?| ?TO ?|FOR )+/g);
      return `for (${i} = ${min}; ${i} <= ${max}; ${i}++) {`;
    }
    case "WHILE": {
      return `while(${split.slice(1, split.length).join(' ')}) {`;
    }
    case "INPUT": {
      if (!checks.identifiers[split[1]]) error(`'Cannot perform input on undeclared '${split[1]}'`);
      if (checks.identifiers[split[1]].constant) error(`Cannot perform input on constant '${split[1]}'`);
      const modifier = (['float','int'].includes(checks.identifiers[split[1]].type) ? "*1" : "");
      return `${split.splice(1).join(' ')} = require('prompt-sync')()()${modifier};`
    }
    case "OUTPUT": {
      return `console.log(${split.slice(1,split.length).join(' ')})`;
    }
    case "OPENFILE": {
      checks.addFile(identifier, split.pop());

      if (checks.files[identifier].state === "READ")
        return `_[${identifier}] = require("fs").readFileSync(${identifier}, {encoding: "utf-8"}).split("\\n")`; // no JS code for opening files
      else if (checks.files[identifier].state === "WRITE")
        return `require("fs").writeFileSync(${identifier}, "", {encoding: "utf-8"})`;
      else if (checks.files[identifier].state === "APPEND")
        return "";
    }
    case "CLOSEFILE": {
      checks.closeFile(identifier);
      return `_[${identifier}] = null`; // no JS code for closing files
    }
    case "READFILE": {
      if (!checks.files[identifier] || checks.files[identifier].state != "READ")
        error("Cannot read file that is not open for reading");
      return `${split[3]} = _[${identifier}].splice(0, 1)[0]`; // "read one line"
    }
    case "WRITEFILE": {
      if (!checks.files[identifier] || !["WRITE", "APPEND"].includes(checks.files[identifier].state))
        error("Cannot write to file that is not open for writing");

      let dataToWrite = line.match(/(?<=, ).+/);
      if (dataToWrite)
        return `require("fs").appendFileSync(${identifier}, ${dataToWrite[0]}+'\\n')`;
      else
        error("Incomplete WRITEFILE statement: missing data");
    }
    default:
      return line;
  }
}

let pcLines = fs.readFileSync('script.pc', {encoding: 'utf-8'}).split('\n');

/* This is all code necessary to run most (but not all) pseudocode scripts. */
/* Includes: common built-in pseudocode functions, array constructors, environemnt variables */
const headerLines = [
  "/* Built-in pseudocode functions */",
  "const MID = (str, start, end) => { if (typeof(str) !== 'string') throw new Error('First parameter of RIGHT must be of STRING type'); if (typeof(start) !== 'number' || start % 1 !== 0) throw new Error('Second parameter of RIGHT must be of INTEGER type'); if (typeof(end) !== 'number' || end % 1 !== 0) throw new Error('Third parameter of RIGHT must be of INTEGER type'); return str.slice(start-1, end+1); }",
  "const LEFT = (str, end) => { if (typeof(str) !== 'string') throw new Error('First parameter of LEFT must be of STRING type'); if (typeof(end) !== 'number' || end % 1 !== 0) throw new Error('Second parameter of LEFT must be of INTEGER type'); return str.slice(0, end+1); }",
  "const RIGHT = (str, end) => { if (typeof(str) !== 'string') throw new Error('First parameter of RIGHT must be of STRING type'); if (typeof(end) !== 'number' || end % 1 !== 0) throw new Error('Second parameter of RIGHT must be of INTEGER type'); return str.slice(str.length-2, end+1); }",
  "const LENGTH = (element) => { if (typeof(element) === 'string' || Array.isArray(element)) return Object.keys(element).length; else throw new Error('LENGTH only accepts ARRAY or STRING type parameters')}",
  "const LCASE = (char) => { if (typeof(char) !== 'string' || char.length !== 1) throw new Error('LCASE only accepts CHAR type parameters'); return char.toLowerCase(); }",
  "const UCASE = (char) => { if (typeof(char) !== 'string' || char.length !== 1) throw new Error('UCASE only accepts CHAR type parameters'); return char.toUpperCase(); }",
  "const INT = (num) => { if (typeof(num) !== 'number' || num % 1 === 0) throw new Error('INT only accepts REAL type parameters'); return num >> 0; }",
  "const RAND = (upper) => { if (typeof(upper) !== 'number' && num % 1 !== 0 ) throw new Error('RAND only accepts INTEGER type parameters'); return Math.random() * upper; }",
  "\n/* Compiler variables */",
  "let _ = {};",
  "_.Array = (min, max, fill=null) => {",
  "return new Proxy(Array(max - min + 1).fill(fill), {",
  "get: (target, name) => { if (name < min || name > max) throw new Error (`Index ${name} is out of array bounds`); return target[name - min] },",
  "set: (target, name, value) => { if (name < min || name > max) throw new Error (`Index ${name} is out of array bounds`); target[name - min] = value }",
  "});\n}\n",
  "/* Translated code begins here */"
];

fs.writeFileSync('compiled.js', headerLines.join('\n')); // create new compiled.js file

pcLines.forEach(pcLine => {

  lineCounter++; // this is only necessary for displaying line error on error messages

  /* Formating */
  pcLine = pcLine.replace(/\/\/.*/g, ''); // remove all comments
  pcLine = pcLine.replace(/(?:  )+/g, ''); // remove double spaces (indentation)
  pcLine = pcLine.replace(/(?<=\w)\(/g, " ("); // add space margin for front parentheses: "a(b)" -> "a (b)"
  pcLine = pcLine.replace(/(?<=\w)\)/g, ") "); // add space margin for back parentheses: "(a)b" -> "(a) b"
  pcLine = pcLine.replace(/(?<=\w)\[/g, " ["); // add space margin for front brackets: "a[b]" -> "a [b]"
  pcLine = pcLine.replace(/(?<=\w)\]/g, "] "); // add space margin for back brackets: "[a]b" -> "[a] b"
  pcLine = pcLine.replace(/[ +]?,[ +]?/g, " , "); // add spaces around commas: 'a,b' -> 'a , b'

  /* Operators */
  pcLine = pcLine.replace(/MOD/g, '%'); // modulus
  pcLine = pcLine.replace(/(?<!<|>)=/g, '==='); // equal sign, unless it is a "<=" or ">="
  pcLine = pcLine.replace(/&/g, "+");
  pcLine = pcLine.replace(/NOT/g, "!");
  pcLine = pcLine.replace(/AND/g, "&&"); // "AND", (TODO: don't match AND within a word)
  pcLine = pcLine.replace(/^[^a-zA-Z]*OR/g, "||"); // "OR", unless it is preceeded by letters
  pcLine = pcLine.replace(/TRUE/g, "true"); // TODO: make sure this isn't in a string?
  pcLine = pcLine.replace(/FALSE/g, "false"); // TODO: make sure this isn't in a string?

  // Functions
  pcLine = pcLine.replace(/ENDPROCEDURE/, '}');
  pcLine = pcLine.replace(/ENDFUNCTION/, '}');
  pcLine = pcLine.replace(/RETURN/, 'return');

  // Loops
  pcLine = pcLine.replace(/NEXT .+/g, '}');
  pcLine = pcLine.replace(/ENDWHILE/g, '}');

  // IFs
  pcLine = pcLine.replace(/ENDIF/g, '}');
  pcLine = pcLine.replace(/THEN/g, '{');
  pcLine = pcLine.replace(/ELSE/g, '} else {');`` // the compiler doesn't use "else if", it uses else { if } (like real pseudocode)

  // Arrays
  const ArrayPatten = /\[ ?\w+( ?, ?\w+)* ?\]/g //                        // matches: '[index]', '[3,7]', '[18,1,4]', etc. 
  if (pcLine.match(ArrayPatten) && pcLine.split(' ')[0] !== "CONSTANT") {
    let replacement = pcLine.match(ArrayPatten)[0].replace(/ , /g, ']['); // '[3,7]' ->  '[3][7]'
    pcLine = pcLine.replace(ArrayPatten, replacement);                    // 'myArr[3,7]' -> 'myArr[3][7]`
  }

  let jsLine = ConvertLine(pcLine);

  // EOFs (need to be replaced after line conversion)
  if (jsLine.match(/EOF \([^\)]+\)/g)) {
    jsLine.match(/EOF \([^\)]+\)/g).forEach(e => {
      let identifier = GetFileName(e); // either filename, or variable

      if (!checks.identifiers[identifier]) error("Cannot read EOF of unopened file");
      if (checks.identifiers[identifier].state != "READ") error("Cannot read EOF of file not open for reading.");

      jsLine = jsLine.replace(e, `(_[${identifier}].length === 0)`); // file "reading" is only simulated, so is EOF
    });
  }

  /* Assignment checks (constant assignment, data type checks, declaration checks). These conflict with FOR loops */
  if (jsLine.includes('<-')) {
    let [element, value] = jsLine.split(/ ?<- ?/g);
    element = element.split(' ').pop();

    // if (!checks.identifiers[element])
    //   error(`Cannot assign value to undeclared variable '${element}'`);
    // else if (checks.identifiers[element].constant)
    //   error(`Cannot assign value to constant variable '${element}'`);

    /* The below commented out lines are responsible for all type checking. The system is broken */
    /* TODO: Fix type checking */
    // if (!value.includes(element) && checks.identifiers[element].type !== TypeOf(value) || checks.identifiers[element.type] == "float" && !['float', 'int'].includes(TypeOf(value))) // first, make sure the "value" doesn't contain the var's name
    //   error(`Cannot assign value to '${element}' of a different data type`);
  
    // checks.identifiers[element].value = value;
    jsLine = jsLine.replace(/<-/, '=');
  }

  fs.appendFileSync('compiled.js', `\n${jsLine}`)
});

/* Check if all files were closed at the end of the script */
Object.keys(checks.files).forEach(i => {
  if (checks.files[i].state != "closed") {
    lineCounter = pcLines.findIndex(l => l.includes("OPENFILE " + i)) + 1; // find the line with the supposed unclosed file
    error("Cannot execute script with unclosed files.");
  }
});